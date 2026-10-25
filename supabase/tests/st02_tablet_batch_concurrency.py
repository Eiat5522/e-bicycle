"""Observed concurrent duplicate batches and local-record replay, real PG16."""
import json
import subprocess
import time


def run_batch_concurrency(psql, env, workspace, name, root):
    base = [str(psql), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1']
    def query(sql, label):
        p = subprocess.run(base + ['-c', sql], env=env, text=True, capture_output=True, timeout=30)
        (workspace / (name + '-batch-' + label + '.log')).write_text(p.stdout + p.stderr)
        if p.returncode:
            raise RuntimeError(label + p.stderr)
        return p.stdout.strip()
    fixture = (root / 'supabase/tests/st02_tablet_batch_fixture.sql').read_text()
    # Fixture is copied into durable test-only input before concurrency sessions.
    fixture += "insert into private.station_approved_notices values ('pdpa','SYNTHETIC','native-only'),('rental','SYNTHETIC','native-only'); create table native_batch_input as select envelope from batch_request; commit;"
    query(fixture, 'fixture')
    auth = "select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000001',true);"
    call = "select private.station_sync_batch(envelope::text) from native_batch_input;"
    results = []
    for variant in ['same-batch', 'same-local-new-batch']:
        # Each race starts from a pristine fixture, including canonical tables.
        if variant != 'same-batch':
            query("delete from public.tablet_sync_records; delete from public.tablet_sync_batches; delete from public.station_assisted_rentals; delete from public.station_assisted_riders; delete from public.bike_status_events where bike_id='station-start-bike'; delete from public.audit_logs where actor_staff_id='94000000-0000-0000-0000-000000000003'; update public.bikes set status='ready_to_rent' where id='station-start-bike';", 'reset')
        a = subprocess.Popen(base, env=dict(env, PGAPPNAME=name+'-batch-a'), text=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        assert a.stdin is not None
        b = None
        def observe(condition):
            end = time.monotonic() + 10
            while time.monotonic() < end:
                if query(condition, 'observe') == '1':
                    return
                time.sleep(.03)
            raise RuntimeError('batch contention not observed')
        try:
            a.stdin.write('begin; set local statement_timeout=15000;' + auth + call + '\n')
            a.stdin.flush()
            observe("select count(*) from pg_stat_activity where application_name='"+name+"-batch-a' and state='idle in transaction'")
            other = call if variant == 'same-batch' else "select private.station_sync_batch((envelope||'{\"clientBatchId\":\"95000000-0000-0000-0000-000000000002\"}')::text) from native_batch_input;"
            b = subprocess.Popen(base, env=dict(env, PGAPPNAME=name+'-batch-b'), text=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            assert b.stdin is not None
            b.stdin.write('begin; set local statement_timeout=15000;' + auth + other + '\n')
            b.stdin.flush()
            observe("select count(*) from pg_stat_activity where application_name='"+name+"-batch-b' and cardinality(pg_blocking_pids(pid))>0")
            ao, ae = a.communicate('commit;\n', timeout=20)
            bo, be = b.communicate('commit;\n', timeout=20)
            (workspace / (name+'-batch-'+variant+'-sessions.log')).write_text(ao+ae+bo+be)
            if a.returncode or b.returncode:
                raise RuntimeError(ae+be)
            ar = json.loads(next(x for x in ao.splitlines() if x.startswith('{')))
            br = json.loads(next(x for x in bo.splitlines() if x.startswith('{')))
            if (variant == 'same-batch' and ar != br) or ar['accepted'] != br['accepted'] or len(ar['accepted']) != 3:
                raise RuntimeError('concurrent responses differ')
            state = query("select json_build_object('riders',(select count(*) from public.station_assisted_riders),'rentals',(select count(*) from public.station_assisted_rentals),'records',(select count(*) from public.tablet_sync_records),'audits',(select count(*) from public.audit_logs where actor_staff_id='94000000-0000-0000-0000-000000000003'),'events',(select count(*) from public.bike_status_events where bike_id='station-start-bike'))", 'state')
            if json.loads(state) != {'riders':1,'rentals':1,'records':3,'audits':3,'events':2}:
                raise RuntimeError(state)
            retry = query('begin;' + auth + call + 'commit;', 'response-loss')
            rr = json.loads(next(x for x in retry.splitlines() if x.startswith('{')))
            if rr != ar:
                raise RuntimeError('response-loss receipt changed')
            results.append({'case':'batch-'+variant,'exit':0,'observed_blocking':True,'response_loss_retry':True})
        finally:
            for proc in [a,b]:
                if proc and proc.poll() is None:
                    proc.kill()
                    proc.wait()
    # Leave existing runner fixtures uncontaminated.
    query("delete from public.tablet_sync_records; delete from public.tablet_sync_batches; delete from public.station_assisted_rentals; delete from public.station_assisted_riders; delete from public.bike_status_events where bike_id='station-start-bike'; delete from public.audit_logs where actor_staff_id='94000000-0000-0000-0000-000000000003'; delete from public.bikes where id='station-start-bike'; delete from public.tablet_devices where device_identifier='native-start'; delete from public.staff_profiles where id='94000000-0000-0000-0000-000000000003'; delete from public.stations where id in ('94000000-0000-0000-0000-000000000002','94000000-0000-0000-0000-000000000012'); delete from auth.users where id in ('94000000-0000-0000-0000-000000000001','94000000-0000-0000-0000-000000000011'); delete from private.station_approved_notices;", 'cleanup')
    return results
