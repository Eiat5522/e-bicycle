"""Native PostgreSQL duplicate-request gate. Use a disposable fully migrated DB.
Run with PGHOST/PGPORT/PGDATABASE set and --psql pointing to native psql.
"""
import argparse
import subprocess
import time

parser = argparse.ArgumentParser()
parser.add_argument("--psql", default="psql")
args = parser.parse_args()
command = [args.psql, "-X", "-At", "-v", "ON_ERROR_STOP=1"]


def sql(statement):
    return subprocess.run(command + ["-c", statement], check=True, text=True,
                          capture_output=True).stdout.strip()


actor = "92000000-0000-0000-0000-000000000001"
bike = "recovery-concurrent"
sql(f"""
insert into auth.users(id,email) values ('{actor}','scoped-concurrent@example.invalid');
update public.wallets set balance=1000 where id='{actor}';
insert into public.bikes(id,model,estimated_range_km,top_speed_kmh,pricing_label,
 rate_per_minute,status,location,latitude,longitude,active_rider_id,
 active_ride_started_at,active_ride_start_location)
values ('{bike}','probe',10,25,'test',2,'in_use','Start',0,0,'{actor}',
 now()-interval '6 minutes','Start');
""")
start = sql(f"select active_ride_started_at from public.bikes where id='{bike}'")
request = f"""set local role authenticated;
set local request.jwt.claims='{{"sub":"{actor}","role":"authenticated"}}';
select to_jsonb(public.complete_ride_recoverable('concurrent-1','{bike}','{start}',2));
"""
first = subprocess.Popen(command + ["-c", "begin; " + request +
                         " select pg_sleep(3); commit;"], text=True,
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE)
second = None
try:
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        if sql("select count(*) from pg_stat_activity where query like '%select pg_sleep(3); commit;%' and wait_event='PgSleep'") == "1":
            break
        time.sleep(0.02)
    else:
        raise AssertionError("first request did not reach held transaction")
    second = subprocess.Popen(command + ["-c", "begin; " + request + " commit;"],
                              text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    deadline = time.monotonic() + 2
    while time.monotonic() < deadline:
        if sql("select count(*) from pg_stat_activity where cardinality(pg_blocking_pids(pid))>0 and query like '%concurrent-1%'") == "1":
            break
        time.sleep(0.02)
    else:
        raise AssertionError("duplicate request was not observed blocked")
    outputs = []
    for process in [first, second]:
        out, err = process.communicate(timeout=10)
        assert process.returncode == 0, err
        outputs.append(next(line for line in out.splitlines() if line.startswith("{")))
    assert outputs[0] == outputs[1], "duplicate result changed"
    assert sql(f"""select
      (select count(*) from public.bike_ride_history where bike_id='{bike}')=1 and
      (select count(*) from public.rental_transactions where bike_id='{bike}')=1 and
      (select count(*) from public.bike_status_events where bike_id='{bike}')=1 and
      (select count(*) from public.wallet_transactions where wallet_id='{actor}' and type='shared_ride')=1 and
      (select count(*) from private.ride_completion_receipts where actor_id='{actor}')=1
    """) == "t", "duplicate financial/history/audit effects"
    print("PASS: observed concurrent duplicate blocked; exact receipt result; one fare, ride, rental, audit, receipt")
finally:
    for process in [first, second]:
        if process is not None and process.poll() is None:
            process.kill()
            process.communicate()
