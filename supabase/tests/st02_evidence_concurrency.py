"""Observed native lock contention for exact and changed reservation retries."""
import json
import subprocess
import time


def run_evidence_concurrency(psql, env, workspace, name, root):
    base = [str(psql), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=verbose']

    def query(sql):
        p = subprocess.run(base + ['-c', sql], env=env, text=True, capture_output=True, timeout=20)
        if p.returncode:
            raise RuntimeError(p.stderr)
        return p.stdout.strip()

    fixture = (root / 'supabase/tests/st02_tablet_batch_fixture.sql').read_text()
    fixture = fixture.replace('94000000', '97000000').replace('95000000', '98000000').replace('station-start-bike', 'evidence-race-bike').replace('native-start', 'evidence-race')
    fixture = fixture.replace('create temp table request', 'create table evidence_race_request').replace('from request;', 'from evidence_race_request;')
    fixture = fixture.replace('insert into request(', 'insert into evidence_race_request(')
    fixture = fixture.replace('create temp table batch_request', 'create table evidence_race_batch').replace('insert into batch_request', 'insert into evidence_race_batch')
    query(fixture + "insert into private.station_evidence_policy values ('application/race-only',3,'SYNTHETIC'); commit;")
    raw = json.dumps(dict(deviceId='97000000-0000-0000-0000-000000000004', evidenceLocalId='98000000-0000-0000-0000-000000000099', parentLocalId='97000000-0000-0000-0000-000000000006', parentKind='rental_start', kind='pre_use_photo', declaredMime='application/race-only', declaredSize=3, declaredSha256='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'))
    auth = "select set_config('request.jwt.claim.sub','97000000-0000-0000-0000-000000000001',true);"
    results = []
    for changed in (False, True):
        query('delete from private.station_evidence_reservations;')
        sessions = []
        try:
            for suffix, payload in [('winner', raw), ('loser', raw + (' ' if changed else ''))]:
                p = subprocess.Popen(base, env=dict(env, PGAPPNAME=name+'-evidence-'+suffix), text=True, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                sessions.append(p)
                p.stdin.write('begin; set local statement_timeout=15000;'+auth+"select (private.station_evidence_reserve('"+payload+"')).id;\n")
                p.stdin.flush()
                deadline = time.monotonic()+10
                predicate = "state='idle in transaction'" if suffix=='winner' else 'cardinality(pg_blocking_pids(pid))>0'
                while query("select count(*) from pg_stat_activity where application_name='"+name+'-evidence-'+suffix+"' and "+predicate) != '1':
                    if time.monotonic()>deadline or p.poll() is not None:
                        raise RuntimeError('reservation contention not observed')
                    time.sleep(.02)
            sessions[0].stdin.write('commit;\n\\q\n')
            sessions[0].stdin.flush()
            out_a, err_a = sessions[0].communicate(timeout=20)
            out_b, err_b = sessions[1].communicate('commit;\n\\q\n', timeout=20)
            (workspace/(name+'-evidence-race-'+str(changed)+'.log')).write_text(out_a+err_a+out_b+err_b)
            if sessions[0].returncode or (not changed and sessions[1].returncode) or (changed and ('EVIDENCE_PAYLOAD_CONFLICT' not in err_b or sessions[1].returncode==0)):
                raise RuntimeError('reservation race result '+err_a+err_b)
            if not changed and out_a.splitlines()[-1] != out_b.splitlines()[-1]:
                raise RuntimeError('reservation race IDs differ')
            if query('select count(*) from private.station_evidence_reservations')!='1':
                raise RuntimeError('reservation race multiplicity')
            results.append({'case':'evidence-changed-race' if changed else 'evidence-exact-race','observed_blocking':True,'exit':0})
        finally:
            for p in sessions:
                if p.poll() is None:
                    p.kill()
                    p.wait()
    return results
