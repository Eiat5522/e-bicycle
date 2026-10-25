"""Actual pinned Supabase Storage + native owner + HTTP acceptance (local only).

Prerequisites: native harness running on its Unix socket, explicit rootless Docker
socket, preloaded pinned image, and rootlessctl port driver. Never pulls images,
starts daemons, reads project .env files, contacts hosted targets or deploys.
"""
import base64
import hashlib
import hmac
import json
import os
from pathlib import Path
import subprocess
import sys
import time
import urllib.request

root = Path(__file__).resolve().parents[2]
w = Path(os.environ.get('ST02_NATIVE_WORKSPACE', str(Path.home() / '.hermes/cache/scratch/r5b-native-8c52na3p'))).resolve()
image = 'supabase/storage-api@sha256:92c5fe87ba5291915d0c21ca530ece9a58e13cc76a36a6c84fc69121a8dde799'
docker_socket = os.environ.get('API08_DOCKER_SOCKET', '')
if docker_socket != str(Path.home() / '.hermes/cache/scratch/api08-rootless/docker.sock'):
    raise RuntimeError('explicit owned rootless socket required')
docker = ['docker', '-H', 'unix://' + docker_socket]
config = json.loads((w / 'env.json').read_text())['env']
if config['PGHOST'] != str(w / 'socket'):
    raise RuntimeError('native Unix socket required')
env = dict(PATH=os.environ['PATH'], LANG='C', LC_ALL='C', **config)
env['LD_LIBRARY_PATH'] = str(w / 'pgroot/usr/lib/x86_64-linux-gnu')
env['PROJ_DATA'] = str(w / 'pgroot/usr/share/proj')
psql = str(w / 'pgroot/usr/lib/postgresql/16/bin/psql')
name = 'storage_http_' + str(os.getpid())
work = w / name
work.mkdir()
source_paths = sorted(set((root / 'apps/web/src/lib/staff-tablet').glob('*.ts')) | set((root / 'apps/web/src/app/api/staff-tablet/evidence').rglob('*.ts')) | {root / p for p in ['package.json','pnpm-lock.yaml','apps/web/package.json','apps/web/jest.config.js','apps/web/tsconfig.json','apps/web/src/lib/supabase/require-staff-tablet-access.ts','apps/web/src/app/api/_utils/json-body.ts']})
source_hashes = {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in source_paths}
results = []
container = 'api08-' + name
storage_db = 'api08_storage_' + str(os.getpid())
port = 55450

def run(args, label, *, process_env=None, input=None, timeout=180):
    p = subprocess.run(args, input=input, text=True, capture_output=True, env=process_env, cwd=root, timeout=timeout)
    (work / (label + '.log')).write_text(p.stdout + p.stderr)
    results.append(dict(case=label, exit=p.returncode))
    if p.returncode:
        raise RuntimeError(label + '\n' + (p.stdout + p.stderr)[-4000:])
    return p.stdout

run(docker + ['image', 'inspect', image, '--format', '{{.Id}}'], 'pinned-image-present')
reuse = os.environ.get('API08_EXISTING_LOCAL_STATE')
if reuse:
    previous_path = Path(reuse).resolve()
    if not previous_path.is_relative_to(w) or previous_path.name != 'manifest.json':
        raise RuntimeError('owned local state manifest required')
    previous = json.loads(previous_path.read_text())
    manifest = Path(previous['native_manifest']).resolve()
    if not manifest.is_relative_to(w):
        raise RuntimeError('owned native evidence required')
    native = json.loads(manifest.read_text())
    if native.get('passed') is not True or native.get('post_freeze_verified') is not True:
        raise RuntimeError('successful native SQL evidence required')
    for relative, expected in native['hashes'].items():
        if relative.startswith('supabase/migrations/') or relative.endswith('.sql'):
            if hashlib.sha256((root / relative).read_bytes()).hexdigest() != expected:
                raise RuntimeError('executed SQL input changed: ' + relative)
    database = native['database']
    storage_db = previous['storage_database']
    import re
    if not re.fullmatch(r'evidence_durable_[0-9]+', database) or not re.fullmatch(r'api08_storage_[0-9]+', storage_db):
        raise RuntimeError('disposable database identity required')
    env['PGDATABASE'] = database
    run([psql, '-X', '-v', 'ON_ERROR_STOP=1', '-c', "do $$ begin if exists(select 1 from private.station_evidence_blobs) then raise exception 'resume requires no previous attachment writes'; end if; end $$"], 'resume-native-state', process_env=env)
    env['PGDATABASE'] = storage_db
    run([psql, '-X', '-v', 'ON_ERROR_STOP=1', '-c', 'grant usage on schema auth,storage to anon,authenticated,service_role'], 'official-storage-schema-usage', process_env=env)
else:
    output = run([sys.executable, 'supabase/tests/st02_evidence_durable_native.py'], 'native-chain', timeout=300)
    manifest = Path(next(s for s in output.splitlines() if s.endswith('-manifest.json')))
    native = json.loads(manifest.read_text())
    database = native['database']
    env['PGDATABASE'] = database
    frozen = w / (database + '-inputs')
    fixture = (frozen / 'supabase/tests/st02_tablet_batch_fixture.sql').read_text().replace('94000000', 'a4000000').replace('95000000', 'a5000000').replace('station-start-bike', 'api08-http-bike').replace('native-start', 'api08-http').replace('Exact Rental ID', 'API08 HTTP Rental')
    seed = work / 'synthetic-http-base.sql'
    seed.write_text(fixture)
    run([psql, '-X', '-v', 'ON_ERROR_STOP=1', '-f', str(seed), '-f', str(frozen / 'supabase/tests/st02_evidence_http_fixture.sql')], 'seed-owner', process_env=env)
    env['PGDATABASE'] = 'postgres'
    run([psql, '-X', '-v', 'ON_ERROR_STOP=1', '-c', 'create database ' + storage_db], 'create-storage-db', process_env=env)
    env['PGDATABASE'] = storage_db
    run([psql, '-X', '-v', 'ON_ERROR_STOP=1'], 'storage-auth-bootstrap', process_env=env, input="do $$ begin if not exists(select 1 from pg_roles where rolname='postgres') then create role postgres nologin; end if; end $$; create schema if not exists auth; create schema if not exists storage; grant usage on schema auth,storage to anon,authenticated,service_role; create schema if not exists extensions; create extension if not exists pgcrypto with schema extensions; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role',true),'') $$;")
secret = 'API08-SYNTHETIC-LOCAL-ONLY-NOT-A-REAL-SECRET-2026'
def jwt(role):
    def b64(b): return base64.urlsafe_b64encode(b).decode().rstrip('=')
    token = b64(b'{"alg":"HS256","typ":"JWT"}') + '.' + b64(json.dumps(dict(role=role, iss='supabase', iat=int(time.time()), exp=int(time.time())+7200), separators=(',', ':')).encode())
    return token + '.' + b64(hmac.new(secret.encode(), token.encode(), hashlib.sha256).digest())
service = jwt('service_role')
anon = jwt('anon')
container_env = dict(ANON_KEY=anon, SERVICE_KEY=service, AUTH_JWT_SECRET=secret,
    DATABASE_URL=f'postgresql://{os.environ.get("USER", "eiat")}@localhost/{storage_db}?host=/pgsocket&port={config["PGPORT"]}',
    POSTGREST_URL='http://127.0.0.1:1', STORAGE_BACKEND='file', FILE_STORAGE_BACKEND_PATH='/var/lib/storage',
    TENANT_ID='api08-local', REGION='local', GLOBAL_S3_BUCKET='api08-local', FILE_SIZE_LIMIT='1024',
    ENABLE_IMAGE_TRANSFORMATION='false', PORT='5000', HOST='0.0.0.0', REQUEST_ALLOW_X_FORWARDED_PATH='true')
envfile = work / 'synthetic-container.env'
envfile.write_text(''.join(k+'='+v+'\n' for k,v in container_env.items()))
envfile.chmod(0o600)
completed = False
port_mapping = None
try:
    run(docker + ['run', '-d', '--name', container, '--network', 'host', '--user', '0:0', '--env-file', str(envfile), '-v', str(w / 'socket')+':/pgsocket', image], 'start-actual-storage')
    rootlessctl = str(Path.home() / '.hermes/cache/scratch/api08-rootless/root/usr/bin/rootlessctl')
    rootless_api = str(Path.home() / '.hermes/cache/scratch/api08-rootless/state/api.sock')
    port_mapping = json.loads(run([rootlessctl, '--socket='+rootless_api, 'add-ports', '--json', f'127.0.0.1:{port}:5000/tcp'], 'loopback-port'))['id']
    origin = f'http://127.0.0.1:{port}'
    deadline = time.monotonic()+90
    while True:
        try:
            with urllib.request.urlopen(origin+'/status', timeout=2) as response:
                if response.status == 200: break
        except Exception:
            if time.monotonic()>deadline: raise RuntimeError('actual Storage failed readiness')
            time.sleep(1)
    owner_config = dict(mode='LOCAL_SYNTHETIC_ONLY', allowDatabaseByteSnapshots=True, psql=psql,
        socket=config['PGHOST'], port=int(config['PGPORT']), database=database,
        libraryPath=env['LD_LIBRARY_PATH'], timeoutMs=10000, maxBytes=1024)
    http_config = dict(owner=owner_config, storage=dict(origin=origin, bucket='api08-native-'+str(os.getpid()), serviceKey=service,
        policy=dict(allowedMimeTypes=['image/bmp'], maxBytes=1024, signedUploadExpirySeconds=7200, timeoutMs=10000, maxChunks=16)))
    configfile = work / 'synthetic-http-config.json'
    configfile.write_text(json.dumps(http_config)); configfile.chmod(0o600)
    test_env = os.environ.copy()
    test_env['API08_NATIVE_HTTP_CONFIG'] = str(configfile)
    run(['pnpm', '--filter', '@glide/web', 'test', 'evidence-owner-native.integration.test.ts'], 'actual-http-storage-tests', process_env=test_env, timeout=180)
    env['PGDATABASE'] = database
    run([psql, '-X', '-v', 'ON_ERROR_STOP=1'], 'durable-readback', process_env=env, input="""
do $$ begin
 if (select count(*) from private.station_evidence_blobs)<>8 or (select count(*) from public.attachments)<>8 then raise exception 'duplicate or missing attachment'; end if;
 if exists(select 1 from private.station_evidence_blobs where bytes<>decode('424d3a00000000000000360000002800000001000000010000000100180000000000040000000000000000000000000000000000000000000000','hex')) then raise exception 'durable bytes changed'; end if;
 if (select sync_status from public.tablet_sync_records where local_id='a4000000-0000-0000-0000-000000000006')<>'accepted' then raise exception 'required files remain pending'; end if;
end $$;
select reservation_id,attachment_id,octet_length(bytes),sha256 from private.station_evidence_blobs order by reservation_id;
""")
    completed = True
finally:
    run(docker + ['logs', container], 'actual-storage-log')
    run(docker + ['stop', '-t', '5', container], 'stop-actual-storage')
    # Delete only this runner's disposable container, never images/user data.
    run(docker + ['rm', container], 'remove-owned-container')
    if port_mapping is not None:
        run([rootlessctl, '--socket='+rootless_api, 'remove-ports', str(port_mapping)], 'remove-owned-port')
    post_hashes = {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in source_paths}
    if post_hashes != source_hashes:
        completed = False
        results.append(dict(case='typescript-source-freeze', exit=1))
    result_manifest = work / 'manifest.json'
    result_manifest.write_text(json.dumps(dict(reused_native_state=bool(reuse), source_hashes=source_hashes, post_source_freeze_verified=post_hashes == source_hashes, native_manifest=str(manifest), image=image, database=database, storage_database=storage_db, results=results, passed=completed and all(r['exit']==0 for r in results)), indent=2))
    print(result_manifest)
    if post_hashes != source_hashes:
        raise RuntimeError('TypeScript execution source drift')
print('PASS actual Supabase Storage issuance/upload/download/mutation + native durable linkage HTTP')
