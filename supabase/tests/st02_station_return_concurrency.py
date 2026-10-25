"""Native observed start/return contention under the canonical bike lock."""
import json
import subprocess
import time


def run_return_concurrency(psql, env, workspace, name, root):
    base = [str(psql), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose']
    def query(sql, label):
        p = subprocess.run(base + ['-c', sql], env=env, text=True, capture_output=True, timeout=25)
        (workspace / (name + '-' + label + '.log')).write_text(p.stdout + p.stderr)
        if p.returncode:
            raise RuntimeError(label + p.stderr)
        return p.stdout.strip()
    device = '94000000-0000-0000-0000-000000000004'
    auth = "select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000001',true);"
    ret = "jsonb_build_object('rentalId','Exact Rental ID','vehicleId','station-start-bike','staffId','94000000-0000-0000-0000-000000000003','returnStationId','94000000-0000-0000-0000-000000000002','returnedAtDevice','2026-07-28T11:00:00Z','paymentState','pending','bikeOutcome','returned_pending_inspection','returnInspection',(start->'preUseInspection')||'{\"checkType\":\"return\",\"nextStatus\":\"returned_pending_inspection\"}')"
    returning = auth + f"select private.station_return_rental('{device}','94000000-0000-0000-0000-000000000007',{ret}) from native_station_request;"
    # Different rental identity and device avoid device/advisory contention;
    # observed blocker must therefore be the shared canonical bike row.
    query("insert into public.tablet_devices(id,device_identifier,station_id) values ('94000000-0000-0000-0000-000000000024','return-race-device','94000000-0000-0000-0000-000000000002'); insert into public.station_assisted_riders(device_id,rider_local_id,station_id,registered_by_staff_id,name,phone,user_type,pdpa_notice_version,pdpa_accepted_at_device,registration_payload) select '94000000-0000-0000-0000-000000000024',rider_local_id,station_id,registered_by_staff_id,name,phone,user_type,pdpa_notice_version,pdpa_accepted_at_device,registration_payload from public.station_assisted_riders where device_id='" + device + "';", 'return-race-fixture')
    starting = auth + "select private.station_start_rental('94000000-0000-0000-0000-000000000024','94000000-0000-0000-0000-000000000026',start||'{\"rentalId\":\"New rental identity\"}' - 'paymentReference') from native_station_request;"
    # Explicit parentheses keep JSONB removal scoped to the merged payload.
    starting = starting.replace("start||'{\"rentalId\":\"New rental identity\"}' - 'paymentReference'", "(start||'{\"rentalId\":\"New rental identity\"}'::jsonb) - 'paymentReference'")
    records = []
    for order in ['return-first', 'start-first', 'duplicate-return']:
        query("delete from private.station_return_blocks; delete from public.station_assisted_rentals where bike_id='station-start-bike'; delete from public.bike_status_events where bike_id='station-start-bike'; delete from public.audit_logs where action_performed in ('station_rental_started','station_rental_returned'); update public.bikes set status='ready_to_rent',active_rider_id=null,active_ride_started_at=null,active_ride_start_location=null where id='station-start-bike';" + auth + f"select private.station_start_rental('{device}','94000000-0000-0000-0000-000000000006',start) from native_station_request;", order + '-reset')
        # Start-first holds the exact row the rejected start would inspect;
        # this makes return wait on a genuine bike row lock, then revalidate.
        first = "select id from public.bikes where id='station-start-bike' for update;" if order == 'start-first' else returning
        if order == 'start-first':
            first += auth + "do $race$ begin begin perform private.station_start_rental('94000000-0000-0000-0000-000000000024','94000000-0000-0000-0000-000000000026',(start||'{\"rentalId\":\"New rental identity\"}'::jsonb)-'paymentReference') from native_station_request; raise exception 'start unexpectedly succeeded'; exception when serialization_failure then null; end; end $race$;"
        second = returning if order in ('start-first','duplicate-return') else starting
        a = subprocess.Popen(base, env=dict(env, PGAPPNAME=name+'-return-winner'), text=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        b = None
        try:
            a.stdin.write('begin; set local statement_timeout=15000; '+first+'\n'); a.stdin.flush()
            def observe(condition):
                end = time.monotonic()+10
                while time.monotonic()<end:
                    if query(condition,order+'-observation')=='1': return
                    time.sleep(.03)
                raise RuntimeError('no observed lock/state '+order)
            observe("select count(*) from pg_stat_activity where application_name='"+name+"-return-winner' and state='idle in transaction'")
            b = subprocess.Popen(base, env=dict(env, PGAPPNAME=name+'-return-waiter'), text=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            b.stdin.write('begin; set local statement_timeout=15000; '+second+'\n'); b.stdin.flush()
            observe("select count(*) from pg_stat_activity where application_name='"+name+"-return-waiter' and cardinality(pg_blocking_pids(pid))>0")
            aout,aerr=a.communicate('commit;\n',timeout=20)
            out,err=b.communicate('commit;\n',timeout=20)
            (workspace/(name+'-'+order+'-sessions.log')).write_text(aout+aerr+out+err)
            if a.returncode or (order=='return-first' and (not b.returncode or '40001' not in err)) or (order!='return-first' and b.returncode):
                raise RuntimeError(order+aerr+err)
            state=json.loads(query("select json_build_object('closed',(select count(*) from public.station_assisted_rentals where returned_at_server is not null),'events',(select count(*) from public.bike_status_events where transition_kind='station_rental_return'),'audits',(select count(*) from public.audit_logs where action_performed='station_rental_returned'),'status',status) from public.bikes where id='station-start-bike'",order+'-final'))
            if state!={'closed':1,'events':1,'audits':1,'status':'returned_pending_inspection'}: raise RuntimeError(str(state))
            records.append({'case':order,'observed_blocking':True,'exit':0,'state':state})
        finally:
            for p in [a,b]:
                if p and p.poll() is None: p.kill(); p.wait()
    return records
