"""Additive API08 native gate. Disposable Unix-socket PG only; no hosted IO.

Run historical native42 runner before adding migration43. This runner freezes
all SQL/Python inputs, applies the full chain and retains exact logs/manifest.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
w = Path(os.environ.get('ST02_NATIVE_WORKSPACE', str(Path.home() / '.hermes/cache/scratch/r5b-native-8c52na3p'))).resolve()
name = 'evidence_durable_' + str(os.getpid())
paths = sorted(p for directory in ['supabase/migrations', 'supabase/tests'] for p in (root / directory).rglob('*') if p.is_file() and p.suffix in ('.sql', '.py', '.json') and '__pycache__' not in p.parts)
if any(p.is_symlink() for p in paths):
    raise RuntimeError('symlink execution input')
frozen = {str(p.relative_to(root)): p.read_bytes() for p in paths}
hashes = {p: hashlib.sha256(b).hexdigest() for p, b in frozen.items()}
snapshot = w / (name + '-inputs')
for relative, data in frozen.items():
    target = snapshot / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
runtime_paths = [w / 'env.json', Path(sys.executable).resolve()] + sorted(p for p in (w / 'pgroot').rglob('*') if p.is_file())
runtime_hashes = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in runtime_paths}
config = json.loads((w / 'env.json').read_text())['env']
if config['PGHOST'] != str(w / 'socket') or any(k not in ('PGHOST', 'PGPORT', 'PGUSER', 'PGDATABASE', 'LD_LIBRARY_PATH') for k in config):
    raise RuntimeError('local harness required')
env = dict(PATH='/usr/bin:/bin', LANG='C', LC_ALL='C', PGPASSFILE='/dev/null', PGSERVICEFILE='/dev/null', **config)
env['LD_LIBRARY_PATH'] = str(w / 'pgroot/usr/lib/x86_64-linux-gnu')
env['PROJ_DATA'] = str(w / 'pgroot/usr/share/proj')
bin_dir = w / 'pgroot/usr/lib/postgresql/16/bin'
results = []

def run(args, label):
    result = subprocess.run([str(bin_dir / 'psql'), '-X', '-qAt', '-v', 'ON_ERROR_STOP=1'] + ([] if label == 'create' else ['--single-transaction']) + args, env=env, text=True, capture_output=True, timeout=120)
    (w / (name + '-' + label + '.log')).write_text(result.stdout + result.stderr)
    results.append(dict(case=label, exit=result.returncode))
    if result.returncode:
        raise RuntimeError(label + '\n' + result.stdout + result.stderr)

completed = False
migrations = []
try:
    migrations = sorted((snapshot / 'supabase/migrations').glob('*.sql'))
    versions = [p.name.split('_')[0] for p in migrations]
    if len(set(versions)) != len(versions) or any(len(v) != 14 or not v.isdigit() for v in versions):
        raise RuntimeError('invalid migration version')
    foundation = json.loads(frozen['supabase/tests/support/evidence42_hashes.json'])
    if len(foundation) != 42 or len(migrations) != 43:
        raise RuntimeError('expected preserved approved42 plus one additive migration')
    if any(hashes['supabase/migrations/' + p] != h for p, h in foundation.items()):
        raise RuntimeError('sealed foundation drift')
    run(['-c', 'create database ' + name], 'create')
    env['PGDATABASE'] = name
    run(['-f', str(snapshot / 'supabase/tests/support/native_bootstrap.sql')], 'bootstrap')
    for migration in migrations:
        run(['-f', str(migration)], migration.name)
    run(['-c', "do $$ begin if exists(select 1 from private.station_evidence_policy) then raise exception 'pristine policy not empty'; end if; end $$"], 'pristine-empty-policy')
    tests = ['st02_station_private_acl.sql', 'st02_station_foundation_denials.sql', 'st02_station_start.sql', 'st02_station_rental_identity.sql', 'st02_complete_ride_canonical_status.sql', 'st02_complete_ride_recovery.sql']
    for phase in ['initial', 'replay']:
        if phase == 'replay':
            run(['-f', str(migrations[-1])], 'replay-migration')
        for test in tests:
            run(['-f', str(snapshot / 'supabase/tests' / test)], phase + '-' + test)
        for test in ['st02_tablet_batch.sql', 'st02_evidence.sql', 'st02_evidence_durable.sql']:
            run(['-f', str(snapshot / 'supabase/tests/st02_tablet_batch_fixture.sql'), '-f', str(snapshot / 'supabase/tests' / test)], phase + '-' + test)
        run(['-f', str(snapshot / 'supabase/tests/st02_station_return.sql'), '-f', str(snapshot / 'supabase/tests/st02_station_return_cases.sql')], phase + '-return')
    # Re-run captured historical concurrency adapters on the final schema.
    sys.path.insert(0, str(snapshot / 'supabase/tests'))
    from st02_evidence_concurrency import run_evidence_concurrency
    from st02_tablet_batch_concurrency import run_batch_concurrency
    from st02_station_return_mutations import run_return_mutations
    from st02_station_start_concurrency import run_concurrency
    from st02_station_return_concurrency import run_return_concurrency
    from st02_tablet_batch_inversion import run_batch_inversion
    for adapter in [run_evidence_concurrency, run_batch_concurrency, run_return_mutations, run_concurrency, run_return_concurrency, run_batch_inversion]:
        results.extend(adapter(bin_dir / 'psql', env, w, name, snapshot))
    p = subprocess.run([sys.executable, '-s', str(snapshot / 'supabase/tests/st02_complete_ride_recovery_concurrency.py'), '--psql', str(bin_dir / 'psql')], env=env, text=True, capture_output=True, timeout=60)
    (w / (name + '-recovery-concurrency.log')).write_text(p.stdout+p.stderr)
    results.append(dict(case='recovery-concurrency', exit=p.returncode))
    if p.returncode:
        raise RuntimeError(p.stdout+p.stderr)
    completed = True
finally:
    now = {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for directory in ['supabase/migrations', 'supabase/tests'] for p in (root / directory).rglob('*') if p.is_file() and p.suffix in ('.sql', '.py', '.json') and '__pycache__' not in p.parts}
    runtime_now = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in runtime_paths}
    if now != hashes or runtime_now != runtime_hashes:
        raise RuntimeError('execution input drift')
    manifest = w / (name + '-manifest.json')
    manifest.write_text(json.dumps(dict(runtime_hashes=runtime_hashes, effective_environment=env, database=name, migration_count=len(migrations), hashes=hashes, results=results, post_freeze_verified=True, passed=completed and all(r['exit'] == 0 for r in results)), indent=2))
    print(manifest)
print('PASS durable native acceptance; initial/replay and historical SQL')
