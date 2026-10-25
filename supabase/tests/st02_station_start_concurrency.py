"""Native psql concurrency assertions; no drivers, hosted IO or timing races."""
import json
import re
import subprocess
import time


def run_concurrency(psql, env, workspace, name, root):
    base = [str(psql), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose']
    records = []

    def query(sql, label):
        p = subprocess.run(base + ['-c', sql], env=env, text=True, capture_output=True, timeout=20)
        (workspace / (name + '-' + label + '.log')).write_text(p.stdout + p.stderr)
        if p.returncode:
            raise RuntimeError(label + ': ' + p.stderr)
        return p.stdout.strip()

    # Retain the same synthetic fixture only within this disposable database.
    fixture = (root / 'supabase/tests/st02_station_start.sql').read_text()
    fixture = re.sub(r'\brequest\b(?!\.)', 'native_station_request', fixture)
    fixture = fixture.replace('create temp table native_station_request', 'create table native_station_request')
    fixture = fixture.replace('rollback;', 'commit;')
    fixture = '\n'.join(line for line in fixture.splitlines() if not line.startswith('\\'))
    query(fixture, 'concurrency-fixture')
    staff = '94000000-0000-0000-0000-000000000001'
    rider = '94000000-0000-0000-0000-000000000011'
    device = '94000000-0000-0000-0000-000000000004'
    local = '94000000-0000-0000-0000-000000000006'
    station = f"select set_config('request.jwt.claim.sub','{staff}',true); select private.station_start_rental('{device}','{local}',start) from native_station_request;"
    mobile = f"set local role authenticated; select set_config('request.jwt.claim.sub','{rider}',true); select * from public.update_bike_status_with_event('station-start-bike','{rider}','ready_to_rent','reserved','2026-07-28T11:00:00Z','reserve','{{}}',null,'{rider}',null,null);"

    def session(sql, app):
        e = dict(env, PGAPPNAME=app)
        p = subprocess.Popen(base, env=e, text=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, bufsize=1)
        p.stdin.write('begin; set local statement_timeout=15000; ' + sql + '\n\\echo READY\n')
        p.stdin.flush()
        return p

    for order, first, second in [('station-first', station, mobile), ('mobile-first', mobile, station), ('duplicate-start', station, station)]:
        query("delete from public.station_assisted_rentals where bike_id='station-start-bike'; delete from public.bike_status_events where bike_id='station-start-bike'; delete from public.audit_logs where action_performed='station_rental_started'; update public.bikes set status='ready_to_rent',active_rider_id=null,active_ride_started_at=null,active_ride_start_location=null where id='station-start-bike';", order + '-reset')
        a = session(first, name + '-winner')
        b = None
        try:
            # Observe the winner completed its mutation and is holding its xact.
            deadline = time.monotonic() + 10
            while time.monotonic() < deadline:
                ready = query("select count(*) from pg_stat_activity where application_name='" + name + "-winner' and state='idle in transaction'", order + '-ready')
                if ready == '1':
                    break
                if a.poll() is not None:
                    raise RuntimeError('winner terminated: ' + a.stderr.read())
                time.sleep(0.03)
            else:
                raise RuntimeError('winner readiness timeout')
            b = session(second, name + '-loser')
            deadline = time.monotonic() + 10
            while time.monotonic() < deadline:
                blocked = query("select count(*) from pg_stat_activity where application_name='" + name + "-loser' and cardinality(pg_blocking_pids(pid))>0", order + '-blocking')
                if blocked == '1':
                    break
                if b.poll() is not None:
                    raise RuntimeError('loser did not block: ' + b.stderr.read())
                time.sleep(0.03)
            else:
                raise RuntimeError('no observed row-lock contention')
            a.stdin.write('commit;\n\\q\n')
            a.stdin.flush()
            a.wait(timeout=10)
            out, err = b.communicate(input='commit;\n\\q\n', timeout=20)
            (workspace / (name + '-' + order + '-loser.log')).write_text(out + err)
            if a.returncode != 0:
                raise RuntimeError('winner failed: ' + a.stderr.read())
            if order == 'duplicate-start':
                if b.returncode != 0:
                    raise RuntimeError('duplicate failed: ' + err)
            elif b.returncode == 0 or '40001' not in err:
                raise RuntimeError('expected losing 40001: ' + err)
            state = json.loads(query("select json_build_object('rentals',(select count(*) from public.station_assisted_rentals where bike_id='station-start-bike'),'events',(select count(*) from public.bike_status_events where bike_id='station-start-bike'),'audits',(select count(*) from public.audit_logs where action_performed='station_rental_started'),'status',status,'owner',active_rider_id) from public.bikes where id='station-start-bike'", order + '-state'))
            expected = {'rentals': 0 if order == 'mobile-first' else 1, 'events': 1, 'audits': 0 if order == 'mobile-first' else 1, 'status': 'reserved' if order == 'mobile-first' else 'in_use', 'owner': rider if order == 'mobile-first' else None}
            if state != expected:
                raise RuntimeError(f'{order}: {state} != {expected}')
            records.append({'case': order, 'observed_blocking': True, 'state': state, 'exit': 0})
        finally:
            for p in [a, b]:
                if p and p.poll() is None:
                    p.kill()
                    p.wait()
    return records
