"""Disposable native PG16 gate; requires existing local r5b harness, no hosted IO."""
import hashlib
import json
import os
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
w = Path('/home/eiat/.hermes/cache/scratch/r5b-native-8c52na3p')
b = w / 'pgroot/usr/lib/postgresql/16/bin/psql'
env = {k: v for k, v in os.environ.items() if not k.startswith('PG')}
env.update(json.loads((w / 'env.json').read_text())['env'])
env['LD_LIBRARY_PATH'] = str(w / 'pgroot/usr/lib/x86_64-linux-gnu')
env['PROJ_DATA'] = str(w / 'pgroot/usr/share/proj')
name = 'station_identity_' + str(os.getpid())
results = []

def run(args, label):
    p = subprocess.run([str(b), '-X', '-v', 'ON_ERROR_STOP=1'] + args,
                       env=env, text=True, capture_output=True)
    (w / (name + '-' + label + '.log')).write_text(p.stdout + p.stderr)
    results.append({'case': label, 'exit': p.returncode})
    if p.returncode:
        raise RuntimeError(label + '\n' + p.stdout + p.stderr)

run(['-c', 'create database ' + name], 'create')
env['PGDATABASE'] = name
bootstrap = (w / 'chain.py').read_text().split('bootstrap="""')[1].split('"""')[0]
bootstrap = bootstrap.replace('create role anon; create role authenticated; create role service_role bypassrls;', '')
run(['-c', bootstrap], 'bootstrap')
files = sorted((root / 'supabase/migrations').glob('*.sql'))
hashes = {f.name: hashlib.sha256(f.read_bytes()).hexdigest() for f in files}
for f in files:
    run(['--single-transaction', '-f', str(f)], f.name)
for phase in ['initial', 'replay']:
    if phase == 'replay':
        run(['-f', str(files[-1])], 'replay-migration')
    for test in ['st02_station_rental_identity.sql', 'st02_complete_ride_canonical_status.sql', 'st02_complete_ride_recovery.sql']:
        run(['-f', str(root / 'supabase/tests' / test)], phase + '-' + test)
if hashes != {f.name: hashlib.sha256(f.read_bytes()).hexdigest() for f in files}:
    raise RuntimeError('migration source changed during verification')
manifest = w / (name + '-manifest.json')
manifest.write_text(json.dumps({'database': name, 'migration_count': len(files), 'hashes': hashes, 'results': results}, indent=2))
print('PASS complete native history, schema identity, existing regressions, additive replay')
print(manifest)
