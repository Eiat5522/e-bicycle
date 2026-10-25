"""Cross-device inversion: real locks, bounded whole-envelope deadlock retry."""
import json
import subprocess
import time
import uuid


def run_batch_inversion(psql, env, workspace, name, root, expect_retry=True):
    base = [str(psql), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose']
    def q(sql, label='query', check=True):
        p = subprocess.run(base + ['-c', sql], env=env, text=True, capture_output=True, timeout=30)
        (workspace / (name + '-inversion-' + label + '.log')).write_text(p.stdout+p.stderr)
        if check and p.returncode:
            raise RuntimeError(p.stderr)
        return p
    def observe(sql):
        end = time.monotonic()+10
        while time.monotonic()<end:
            if q(sql).stdout.strip() == '1':
                return
            time.sleep(.02)
        raise RuntimeError('expected native lock wait not observed: '+sql)
    def literal(x):
        return "'"+x.replace("'", "''")+"'"
    fixture = (root/'supabase/tests/st02_tablet_batch_fixture.sql').read_text()
    # Independent unique actors/devices and bikes, no reuse of historical fixtures.
    fixture = fixture.replace('94000000', '96000000').replace('95000000', '97000000').replace('station-start-bike','inversion-bike-a').replace('native-start','inversion-a')
    setup = fixture + "\ninsert into private.station_approved_notices values ('pdpa','SYNTHETIC','inversion-only'),('rental','SYNTHETIC','inversion-only') on conflict do nothing;\n"
    setup += "insert into auth.users(id,email) values ('96000000-0000-0000-0000-000000000021','inversion-b@example.invalid'); insert into public.staff_profiles(id,profile_id,staff_name,role,station_id) values ('96000000-0000-0000-0000-000000000023','96000000-0000-0000-0000-000000000021','B','station_admin','96000000-0000-0000-0000-000000000002'); insert into public.tablet_devices(id,device_identifier,station_id) values ('96000000-0000-0000-0000-000000000024','inversion-b','96000000-0000-0000-0000-000000000002');"
    setup += "insert into public.bikes(id,model,estimated_range_km,top_speed_kmh,pricing_label,rate_per_minute,status,location,latitude,longitude,station_id) select 'inversion-bike-b',model,estimated_range_km,top_speed_kmh,pricing_label,rate_per_minute,status,location,latitude,longitude,station_id from public.bikes where id='inversion-bike-a'; create table native_inversion_template as select envelope from batch_request; commit;"
    q(setup, 'fixture')
    template = json.loads(q('select envelope from native_inversion_template').stdout)
    # Register each rider once outside the tested batches.
    actors = ['96000000-0000-0000-0000-000000000001','96000000-0000-0000-0000-000000000021']
    devices = [template['deviceId'], '96000000-0000-0000-0000-000000000024']
    staffs = [template['staffId'], '96000000-0000-0000-0000-000000000023']
    def auth(i):
        return "select set_config('request.jwt.claim.sub',"+literal(actors[i])+",true);"
    for i in range(2):
        reg = dict(template['records'][2]['payload'])
        reg['pdpaConsent'] = dict(reg['pdpaConsent'], staffId=staffs[i])
        q('begin;'+auth(i)+'select private.station_register_rider('+literal(devices[i])+','+literal(json.dumps(reg))+');commit;', 'register-'+str(i))
    q("create table public.native_inversion_identities(device uuid primary key, raw text); create sequence native_inversion_attempts; create function public.native_inversion_pause() returns trigger language plpgsql as $$ begin if (select b.raw_request is distinct from i.raw or b.actor_profile_id is distinct from auth.uid() or b.staff_id is distinct from (i.raw::jsonb->>'staffId')::uuid or b.station_id is distinct from (i.raw::jsonb->>'stationId')::uuid from public.tablet_sync_batches b join public.native_inversion_identities i on i.device=b.device_id where b.id=new.sync_batch_id) then raise exception 'retry identity changed'; end if; if new.record_type='rental_start' then perform nextval('public.native_inversion_attempts'); if current_setting('application_name') like '%-inv-a' then perform pg_advisory_xact_lock(870001); elsif current_setting('application_name') like '%-inv-b' then perform pg_advisory_xact_lock(870002); end if; end if; return new; end $$; create trigger native_inversion_pause after insert on public.tablet_sync_records for each row execute function public.native_inversion_pause();", 'trigger')
    results=[]
    for variant in ['rental-order','bike-order']:
        requests=[]
        for i in range(2):
            e=dict(template, deviceId=devices[i], staffId=staffs[i], clientBatchId=str(uuid.uuid4()))
            records=[]
            for bike in (['a','b'] if i==0 else ['b','a']):
                p=dict(template['records'][1]['payload'], staffId=staffs[i], vehicleId='inversion-bike-'+bike,
                       rentalId='inversion-'+variant+'-'+bike+('' if variant=='rental-order' else '-'+str(i)))
                p['paymentReference']=dict(p['paymentReference'], rentalId=p['rentalId'])
                records.append(dict(template['records'][1], localId=str(uuid.uuid4()), dependencies=[], payload=p))
            e['records']=records
            requests.append(json.dumps(e))
        q('truncate public.native_inversion_identities;insert into public.native_inversion_identities values '+','.join('('+literal(devices[i])+','+literal(requests[i])+')' for i in range(2)),variant+'-identities')
        calls=['begin; set local statement_timeout=20000;'+auth(i)+'select private.station_sync_batch('+literal(requests[i])+');commit;\n' for i in range(2)]
        gate=subprocess.Popen(base,env=env,text=True,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        sessions=[]
        try:
            assert gate.stdin is not None
            gate.stdin.write('select pg_advisory_lock(870001);select pg_advisory_lock(870002);\n');gate.stdin.flush()
            observe("select (count(*)=2)::int from pg_locks where locktype='advisory' and objid in (870001,870002) and granted")
            for i in range(2):
                p=subprocess.Popen(base,env=dict(env,PGAPPNAME=name+'-inv-'+('a' if i==0 else 'b')),text=True,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
                assert p.stdin is not None
                p.stdin.write(calls[i]);p.stdin.flush();sessions.append(p)
            observe("select (count(*)=2)::int from pg_stat_activity where application_name in ('"+name+"-inv-a','"+name+"-inv-b') and cardinality(pg_blocking_pids(pid))>0")
            for identity in ['', '96000000-0000-0000-0000-000000000011']:
                unauthorized=q("begin;set local statement_timeout=500;select set_config('request.jwt.claim.sub',"+literal(identity)+",true);select private.station_sync_batch("+literal(requests[0])+");commit;", variant+'-unauthorized-'+('null' if not identity else 'nonstaff'),False)
                assert unauthorized.returncode and '42501' in unauthorized.stderr, unauthorized.stderr
            assert q('select last_value from native_inversion_attempts').stdout.strip()=='2'
            gate.communicate('select pg_advisory_unlock_all();\n',timeout=5)
            observe("select (count(*)=2)::int from pg_stat_activity a where a.application_name in ('"+name+"-inv-a','"+name+"-inv-b') and exists(select 1 from pg_stat_activity b where b.pid=any(pg_blocking_pids(a.pid)) and b.application_name in ('"+name+"-inv-a','"+name+"-inv-b'))")
            q("select application_name,wait_event_type,wait_event,pg_blocking_pids(pid) from pg_stat_activity where application_name in ('"+name+"-inv-a','"+name+"-inv-b')",variant+'-cycle')
            outputs=[p.communicate(timeout=30) for p in sessions]
            (workspace/(name+'-inversion-'+variant+'-sessions.log')).write_text('\n'.join(a+b for a,b in outputs))
            if not expect_retry:
                assert sum(p.returncode!=0 for p in sessions)==1
                assert any('40P01' in err for out,err in outputs)
                return [{'case':'pre-fix-real-inversion','observed_waits':True,'sqlstate':'40P01'}]
            # Bounded retry is not a promise of deadlock-free scheduling. If
            # the second attempt also inverts, propagate 40P01 with no receipt;
            # after the winner commits an exact caller retry must be safe.
            exhausted = 0
            for i, proc in enumerate(sessions):
                if proc.returncode:
                    exhausted += 1
                    assert '40P01' in outputs[i][1], outputs
                    assert q("select (not exists(select 1 from public.tablet_sync_batches where device_id='"+devices[i]+"') and not exists(select 1 from public.tablet_sync_records where device_id='"+devices[i]+"') and not exists(select 1 from public.station_assisted_rentals where device_id='"+devices[i]+"'))::int").stdout.strip()=='1'
                    retried = q(calls[i],variant+'-exact-after-exhaustion')
                    outputs[i]=(retried.stdout,retried.stderr)
            assert exhausted <= 1
            responses=[json.loads(next(x for x in out.splitlines() if x.startswith('{'))) for out,err in outputs]
            assert sorted(len(r['accepted']) for r in responses)==[0,2], responses
            assert sorted(len(r['conflicts']) for r in responses)==[0,2], responses
            assert q("select last_value from native_inversion_attempts").stdout.strip()==str(5+exhausted)
            for i in range(2):
                replay=q(calls[i],variant+'-replay-'+str(i))
                assert json.loads(next(x for x in replay.stdout.splitlines() if x.startswith('{')))==responses[i]
                changed=q(calls[i].replace(literal(requests[i]),literal(requests[i]+' ')),variant+'-changed-'+str(i),False)
                assert changed.returncode and 'SYNC_BATCH_PAYLOAD_CONFLICT' in changed.stderr
            state=q("select json_build_array((select count(*) from public.tablet_sync_batches where device_id in ('"+devices[0]+"','"+devices[1]+"')),(select count(*) from public.tablet_sync_records where device_id in ('"+devices[0]+"','"+devices[1]+"')),(select count(*) from public.station_assisted_rentals where bike_id like 'inversion-bike-%'),(select count(*) from public.bike_status_events where bike_id like 'inversion-bike-%'))").stdout
            assert json.loads(state)==[2,4,2,2], state
            results.append({'case':'cross-device-'+variant,'exit':0,'observed_blocking':True,'whole_batch_retry_once':True,'automatic_retry_exhausted':bool(exhausted),'exact_client_retry_after_exhaustion':bool(exhausted),'immutable_replays':True})
        finally:
            for p in [gate]+sessions:
                if p.poll() is None: p.kill();p.wait()
                out, err = p.communicate()
                (workspace/(name+'-inversion-process-'+str(p.pid)+'.log')).write_text(out+err)
        q("delete from public.tablet_sync_records where device_id in ('"+devices[0]+"','"+devices[1]+"');delete from public.tablet_sync_batches where device_id in ('"+devices[0]+"','"+devices[1]+"');delete from public.station_assisted_rentals where bike_id like 'inversion-bike-%';delete from public.bike_status_events where bike_id like 'inversion-bike-%';update public.bikes set status='ready_to_rent' where id like 'inversion-bike-%';alter sequence native_inversion_attempts restart;", 'reset-'+variant)
    q('drop trigger native_inversion_pause on public.tablet_sync_records;drop function public.native_inversion_pause();', 'drop-trigger')
    # Inject deadlock SQLSTATE twice after canonical effects: bounded retry must
    # propagate the second error and leave no receipts/canonical changes.
    q("create function public.native_inversion_fail() returns trigger language plpgsql as $$ begin perform nextval('public.native_inversion_attempts'); raise exception 'synthetic deadlock after canonical effects' using errcode='40P01'; end $$;create trigger native_inversion_fail after insert on public.tablet_sync_records for each row execute function public.native_inversion_fail();", 'failure-trigger')
    def immutable_state():
        tables=['tablet_sync_batches','tablet_sync_records','station_assisted_rentals','station_assisted_riders','bikes','bike_status_events','audit_logs']
        return q('select jsonb_build_array('+','.join("(select coalesce(jsonb_agg(x order by x::text),'[]'::jsonb) from (select to_jsonb(t) x from public."+t+" t) rows)" for t in tables)+')').stdout.strip()
    before_failure=immutable_state()
    failed=q(calls[0],'retry-exhausted',False)
    assert failed.returncode and '40P01' in failed.stderr
    assert immutable_state()==before_failure, 'exhausted retry changed canonical state or previous receipts'
    assert q('select last_value from native_inversion_attempts').stdout.strip()=='2'
    assert q("select (not exists(select 1 from public.tablet_sync_records where device_id='"+devices[0]+"') and not exists(select 1 from public.tablet_sync_batches where device_id='"+devices[0]+"') and not exists(select 1 from public.station_assisted_rentals where bike_id like 'inversion-bike-%') and not exists(select 1 from public.bike_status_events where bike_id like 'inversion-bike-%'))::int").stdout.strip()=='1'
    q('drop trigger native_inversion_fail on public.tablet_sync_records;drop function public.native_inversion_fail();', 'drop-failure')
    # Same unchanged request remains usable after exhausted retry (no poisoned receipt).
    ok=q(calls[0],'unchanged-after-failure')
    assert len(json.loads(next(x for x in ok.stdout.splitlines() if x.startswith('{')))['accepted'])==2
    results.append({'case':'deadlock-retry-exhausted','exit':0,'attempts':2,'atomic_rollback':True,'unchanged_identity_retry':True})
    return results
