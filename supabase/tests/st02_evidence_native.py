"""Disposable PG16 gate. Only local Unix sockets; no hosted IO.

ST02_NATIVE_WORKSPACE selects an existing local harness (env.json + pgroot).
All source/configuration inputs are captured before local imports or SQL. The
repository-owned bootstrap replaces extraction/execution from scratch chain.py.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[2]
w = Path(os.environ.get('ST02_NATIVE_WORKSPACE', str(Path.home() / '.hermes/cache/scratch/r5b-native-8c52na3p'))).resolve()
name = 'evidence_' + str(os.getpid())
results = []


def digest(data):
    return hashlib.sha256(data).hexdigest()


def sources():
    # Inventory is rediscovered afterwards: additions/deletions also fail closed.
    paths = list((root / 'supabase/migrations').glob('*.sql'))
    paths += [p for p in (root / 'supabase/tests').rglob('*')
              if p.is_file() and p.suffix in ('.sql', '.py', '.json') and '__pycache__' not in p.parts]
    if any(p.is_symlink() for p in paths):
        raise RuntimeError('symlink in repository execution inputs')
    return sorted(paths)


# Capture everything before parsing env/manifest, importing adapters or SQL.
source_bytes = {str(p.relative_to(root)): p.read_bytes() for p in sources()}
source_hashes = {k: digest(v) for k, v in source_bytes.items()}
external_paths = [w / 'env.json', Path(sys.executable).resolve()]
# Native client/extension runtime is external input, not merely its path.
external_paths += [p for p in (w / 'pgroot').rglob('*') if p.is_file()]
external_hashes = {str(p): digest(p.read_bytes()) for p in external_paths}
config = json.loads((w / 'env.json').read_text())['env']
env = {'PATH': '/usr/bin:/bin', 'LANG': 'C', 'LC_ALL': 'C'}
env.update(config)
env['LD_LIBRARY_PATH'] = str(w / 'pgroot/usr/lib/x86_64-linux-gnu')
env['PROJ_DATA'] = str(w / 'pgroot/usr/share/proj')
# Never serialize inherited environment values/secrets. Only supported PG config.
if any(k not in ('PGHOST', 'PGPORT', 'PGUSER', 'PGDATABASE', 'LD_LIBRARY_PATH') for k in config):
    raise RuntimeError('unsupported or secret-bearing harness configuration')
if env.get('PGHOST') != str(w / 'socket'):
    raise RuntimeError('refusing non-harness PostgreSQL socket')
# Empty home avoids user psqlrc/service/passfile and Python startup adapters.
env.update(PGPASSFILE='/dev/null', PGSERVICEFILE='/dev/null', PYTHONNOUSERSITE='1')
env.pop('PYTHONPATH', None)
b = w / 'pgroot/usr/lib/postgresql/16/bin/psql'
freeze = {'sources': source_hashes, 'external': external_hashes,
          'effective_environment': dict(env, PGDATABASE=name),
          'effective_pg_config': config,
          'effective_bootstrap_sha256': digest(source_bytes['supabase/tests/support/native_bootstrap.sql'])}
(w / (name + '-input-freeze.json')).write_text(json.dumps(freeze, indent=2))
# Execute the captured bytes, including concurrency adapters, not mutable originals.
snapshot = w / (name + '-inputs')
for relative, data in source_bytes.items():
    target = snapshot / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
foundation = json.loads(source_bytes['supabase/tests/support/foundation_hashes.json'])
files = sorted((snapshot / 'supabase/migrations').glob('*.sql'))
hashes = {p.name: digest(p.read_bytes()) for p in files}
if len(foundation) != 38 or any(hashes.get(k) != v for k, v in foundation.items()):
    raise RuntimeError('sealed 38-migration foundation changed')
for suffix, expected in {
    '160000_add_station_assisted_rental_identity.sql': 'b3f9814eec78f96d67707746aad6565bd32ca850e7b6f39a4ee81f177889280a',
    '170000_add_private_station_start_processors.sql': 'e8a75a8e134c2d60c1326c5fdf4b893bbe0c5ea5126d9aeb67d16da72fe6b1c3',
    '190000_add_private_tablet_batch_orchestrator.sql': 'd12480d8b38b9d206ad0c8d790bde497a75e7319bb4609afa65500feb38944cf',
    '180000_add_private_station_return_processor.sql': 'fc06779a18402fa1da0310732f2be82541fc2d7b57ecde4055d3dd35ac3bc4c7',
}.items():
    if hashes.get('20260728' + suffix) != expected:
        raise RuntimeError('sealed migration changed: ' + suffix)
if len(files) != 42:
    raise RuntimeError('expected full 42 migration chain')
versions = [p.name.split('_', 1)[0] for p in files]
if any(len(v) != 14 or not v.isdigit() for v in versions) or len(set(versions)) != len(versions):
    raise RuntimeError('migration versions must be unique 14-digit values')


# Import only captured, prehashed support, never the mutable source checkout.
sys.path.insert(0, str(snapshot / 'supabase/tests'))
from native_input_freeze import verify_inputs


def verify():
    current = {str(p.relative_to(root)): digest(p.read_bytes()) for p in sources()}
    if current != source_hashes:
        raise RuntimeError('repository input content/inventory changed')
    runtime = [w / 'env.json', Path(sys.executable).resolve()]
    runtime += [p for p in (w / 'pgroot').rglob('*') if p.is_file()]
    if {str(p): digest(p.read_bytes()) for p in runtime} != external_hashes:
        raise RuntimeError('external input content/inventory changed')
    verify_inputs(snapshot, source_hashes)


def run(args, label):
    p = subprocess.run([str(b), '-X', '-v', 'ON_ERROR_STOP=1'] + args,
                       env=env, text=True, capture_output=True, timeout=90)
    (w / (name + '-' + label + '.log')).write_text(p.stdout + p.stderr)
    results.append({'case': label, 'exit': p.returncode})
    if p.returncode:
        raise RuntimeError(label + '\n' + p.stdout + p.stderr)


try:
    run(['-c', 'create database ' + name], 'create')
    env['PGDATABASE'] = name
    run(['-f', str(snapshot / 'supabase/tests/support/native_bootstrap.sql')], 'bootstrap')
    for f in files:
        run(['--single-transaction', '-f', str(f)], f.name)
    run(['-c', "do $$ begin if exists(select 1 from private.station_approved_notices) then raise exception 'pristine notice registry must be empty'; end if; end $$;"], 'pristine-empty-notice-registry')
    for phase in ['initial', 'replay']:
        if phase == 'replay':
            run(['-f', str(files[-1])], 'replay-migration')
        for test in ['st02_station_private_acl.sql', 'st02_station_foundation_denials.sql', 'st02_station_start.sql', 'st02_station_rental_identity.sql', 'st02_complete_ride_canonical_status.sql', 'st02_complete_ride_recovery.sql']:
            run(['-f', str(snapshot / 'supabase/tests' / test)], phase + '-' + test)
        run(['-f', str(snapshot / 'supabase/tests/st02_tablet_batch_fixture.sql'), '-f', str(snapshot / 'supabase/tests/st02_evidence.sql')], phase + '-evidence')
        run(['-f', str(snapshot / 'supabase/tests/st02_tablet_batch_fixture.sql'), '-f', str(snapshot / 'supabase/tests/st02_tablet_batch.sql')], phase + '-batch')
        run(['-f', str(snapshot / 'supabase/tests/st02_station_return.sql'), '-f', str(snapshot / 'supabase/tests/st02_station_return_cases.sql')], phase + '-return')
    sys.path.insert(0, str(snapshot / 'supabase/tests'))
    from st02_evidence_concurrency import run_evidence_concurrency
    results.extend(run_evidence_concurrency(b, env, w, name, snapshot))
    from st02_tablet_batch_concurrency import run_batch_concurrency
    results.extend(run_batch_concurrency(b, env, w, name, snapshot))
    from st02_station_return_mutations import run_return_mutations
    results.extend(run_return_mutations(b, env, w, name, snapshot))
    from st02_station_start_concurrency import run_concurrency
    results.extend(run_concurrency(b, env, w, name, snapshot))
    from st02_station_return_concurrency import run_return_concurrency
    results.extend(run_return_concurrency(b, env, w, name, snapshot))
    p = subprocess.run([sys.executable, '-s', str(snapshot / 'supabase/tests/st02_complete_ride_recovery_concurrency.py'), '--psql', str(b)], env=env, text=True, capture_output=True, timeout=45)
    (w / (name + '-recovery-concurrency.log')).write_text(p.stdout+p.stderr)
    results.append({'case': 'recovery-concurrency', 'exit': p.returncode})
    if p.returncode:
        raise RuntimeError(p.stdout+p.stderr)
    from st02_tablet_batch_inversion import run_batch_inversion
    results.extend(run_batch_inversion(b, env, w, name, snapshot))
    run(['-c', "do $$ begin if (select count(*) from private.station_approved_notices)<>2 or exists(select 1 from private.station_approved_notices where version<>'SYNTHETIC') then raise exception 'unexpected final fixture notice registry'; end if; end $$; select * from private.station_approved_notices order by kind;"], 'final-synthetic-notice-registry')
    p = subprocess.run([sys.executable, '-s', '-m', 'unittest', 'discover', '-s', str(snapshot / 'supabase/tests'), '-p', 'test_native_input_freeze.py'], env=env, text=True, capture_output=True, timeout=45)
    (w / (name + '-freeze-unit-tests.log')).write_text(p.stdout+p.stderr)
    results.append({'case': 'freeze-unit-tests', 'exit': p.returncode})
    if p.returncode:
        raise RuntimeError(p.stdout+p.stderr)
finally:
    # Runs even if SQL/import/concurrency fails; no successful manifest on drift.
    verify()
manifest = w / (name + '-manifest.json')
manifest.write_text(json.dumps({'database': name, 'migration_count': len(files),
    'preserved_foundation_count': len(foundation), 'public_gate': 'closed',
    'pristine_notice_registry_count': 0, 'final_synthetic_notice_registry_count': 2,
    'hashes': hashes, 'input_freeze': freeze, 'post_freeze_verified': True,
    'results': results, 'step_count': len(results)}, indent=2))
print('PASS full 42-migration native history; pre/post freeze + freeze unit tests; initial/replay SQL; station/mobile races; cross-device rental/bike inversion and bounded atomic retry; pristine approvals=0, final synthetic fixtures=2')
print(manifest)
