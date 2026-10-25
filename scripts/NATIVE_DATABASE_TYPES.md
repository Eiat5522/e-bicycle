# Native database type generation

Use the official, unmodified Supabase `postgres-meta` package entrypoint
`npm run --silent gen:types:typescript`, pinned to commit
`ecc19497dcfcb4dc6a83d02e49d812f747cbf981` (`@supabase/typegen` 0.2.2).
Node used: v22.22.2. No Docker, sudo, PGlite, hosted writes, or handwritten
Database declarations are involved. Supabase CLI 2.117.0 exposes `gen types
--db-url`, but did not successfully generate against this UNIX-socket-only
native database; the upstream package's own generation script does.

## Reproduce

First bootstrap an isolated native PostgreSQL database using the reviewed
native migration harness, apply every migration in timestamp order, and retain
its JSON manifest (`migration_count`, `hashes`, and successful legacy `cases` or
frozen-harness `results`). The
manifest must correspond to the actual database supplied below: the generation
wrapper validates input hashes but cannot independently prove how a database
was built. Do not point this workflow at hosted environments.

```sh
PG_META_DB_URL='postgresql://eiat@localhost:55439/st02_typegen_37?host=/home/eiat/.hermes/cache/scratch/r5b-native-8c52na3p/socket' \
TYPEGEN_MIGRATION_MANIFEST=/home/eiat/.hermes/cache/scratch/r5b-native-8c52na3p/typegen-native-manifest.json \
python3 scripts/generate-native-database-types.py
```

The wrapper rejects non-loopback database hosts, accepts an absolute UNIX-socket
`host` query override, and rejects duplicate/other query parameters (including
`hostaddr`, service and connection-option overrides). Errors do not echo the URL.
All validations use explicit exceptions and remain active under `python3 -O`.
A nonempty migration set, exact per-file hashes/count, and a nonempty list of
strict integer-zero case exits are required before any generator execution.
This proves manifest consistency, not that the supplied database was built by it.

### Supported manifest adapters

- Legacy (including the 37-migration harness): nonempty `cases`, every `exit`
  exactly integer zero, and exact checkout migration hashes/count.
- Frozen native40/native41: nonempty named `results`, exact integer `step_count`,
  valid preserved-foundation count, `public_gate: "closed"`, a pre-run
  `input_freeze` snapshot and literal boolean `post_freeze_verified: true`.
  The snapshot must contain nonempty SHA-256 `sources`, an `external` hash map,
  string-valued effective environment/config maps and a bootstrap SHA-256.
  Its migration inventory must exactly match manifest and checkout; a 40-input
  manifest cannot authorize generation against a 41-input checkout.
- Presence of any frozen-schema marker selects the strict adapter; it cannot
  fall back to legacy if incomplete. Migration counts of 40 or greater cannot
  use the legacy adapter. If both aliases occur they must agree, and both must
  contain strict integer-zero exits (Python's `False == 0` is not accepted).
  Missing/null/false completion, empty results and string/float/bool statuses
  fail closed. Normalization does not mutate the supplied manifest.

The snapshot and completion marker are trusted harness evidence, not an
independent rerun of the freeze verifier. The generator does not read external
snapshot paths or authenticate local manifest authorship.

**Native41 publication verified:** independent schema approval was supplied for
`tablet_batch_77225-manifest.json` (82 successful steps, exact 41 migration hashes).
Both clients have now been generated twice from a separate pristine native41
database; see the native41 evidence below. Public and release gates remain closed.
Local addresses can still reach a tunnel/proxy; operators must supply a disposable
native database, not a forwarded hosted database.

The wrapper checks out the pinned upstream source in Hermes scratch and rejects
tracked, untracked and ignored changes except `node_modules/`. The first hardened
run reinstalls any pre-existing, unproven dependencies using the pinned lockfile
with `npm ci --ignore-scripts --no-audit --no-fund`. A scratch receipt binds the
revision, package/lock hashes and complete dependency-tree bytes, names, modes and
symlink targets. Later runs reuse the installation only when that fingerprint
matches; mismatches fail closed rather than repairing silently. Escaping symlinks
are rejected, and the tree is checked again after generation. Delete both the
scratch checkout and `st02-postgres-meta-dependencies.json` to rebuild a rejected
cache. This is integrity verification within a trusted local account, not a defense
against an attacker who can rewrite the checkout, receipt, or executables together.

Generator subprocesses receive an allowlisted environment, not inherited
`PG_META_*`, libpq, Node injection, or npm configuration overrides; only the validated
DB URL, public schema and one-to-one settings are added for generation. User/global
npm config files are replaced by two distinct empty mode-0600 files in a private
scratch directory, cleaned up after each subprocess scope. Do not use `/dev/null`
for both: npm rejects that as double-loading the same config file. Inherited npm
overrides and user/global credentials are not passed through. The upstream tracked package/lock configuration
remains authoritative. PATH and the local Git/Node/npm executables are trusted.

The official entrypoint's untouched output and provenance are staged completely
before publication. Replacement errors roll back already-replaced files; failure
of rollback itself reports and retains recovery backups. This is not cross-file
atomic visibility or power-loss/SIGKILL safety. Do not run concurrent generators or
edit the source/dependency cache during generation. Run twice and compare hashes
to check deterministic generation.

## Offline safety regressions

```sh
python3 -m unittest discover -s scripts/tests -v
python3 -O -m unittest discover -s scripts/tests -v
```

These tests use temporary scratch files and mostly mocked process boundaries. One
smoke test executes real `npm config get registry --offline` with distinct empty
user/global config files, a poisoned home config and an inherited registry override;
it checks the default registry and config-file cleanup. They perform no dependency
downloads, database access, hosted writes, or application type writes.
They cover URL redaction/overrides, manifest gates, environment isolation, source
cleanliness, cache reuse/tampering, invalid output, staging failures, publication
rollback and retained backups when rollback fails. They do not replace a real native
generation run. The previously verified output/evidence below is preserved.

The npm-config correction was exercised with actual `npm ci` and two executions of
the pinned, unmodified upstream generator against the existing disposable
`st02_typegen_37` database. Both returned the SHA-256 below. Only final publication
was intercepted to compare the generated bytes with both existing app files; neither
app output, the original provenance nor any migration SQL was changed. The second
execution also exercised validated dependency-cache reuse. Verification manifest:
`/home/eiat/.hermes/cache/scratch/st02-typegen-config-verification.json`; full run
provenance: `st02-typegen-config-run-1.json` and `st02-typegen-config-run-2.json` in
the same scratch directory. All 11 offline regressions passed normally and with `-O`.

Schema scope is explicitly **public only**, with one-to-one relationship
detection enabled. Previous files also included hosted `storage` and
`graphql_public` schemas; those are intentionally not represented by native
bootstrap stubs. No application contract tests or web typechecks require those
scopes. Extension-internal types are still introspected by the official tool.

## Verified recovery candidate

- PostgreSQL 16.15, new disposable database `st02_typegen_37`.
- Native harness: `/home/eiat/.hermes/cache/scratch/r5b-native-8c52na3p/typegen_gate.py`
  (same bootstrap and ordered application as `p1_gate.py`, separate database/logs).
- All 37 migration hashes matched `independent-native-manifest.json` before
  applying; all migration/application and initial/replay RPC cases exited zero.
- Canonical-return migration SHA-256:
  `ec29d41a2c9d137fca969148ee6b004a152786ca0a72063a0cd99008cd0bcca5`.
- Receipt migration SHA-256:
  `49db5cfa0713207b7b65ab9d3782cd92bc80f9d797e7a16ee6b31a3ac916d8f8`.
- Both output files, two independent generation executions, SHA-256:
  `19a3ac53f0e6f560fb37e7c627365ed6b08de85308fb9ebd09ee882c1012ad64`.
- Complete per-migration hashes and generation settings:
  `/home/eiat/.hermes/cache/scratch/st02-typegen-provenance.json`.
- Web typecheck and both app schema-contract Jest suites passed.
- Root typecheck remains blocked by mobile `src/lib/telemetry-service.ts:91`:
  its Insert metadata cast explicitly admits `null`, while actual generation
  produces `NonNullable<Json>` for the NOT NULL JSON column. This is a table
  Insert mismatch, not an RPC argument issue. Caller code was not changed.

The previous mobile hand-added recovery RPC alias was replaced by actual
introspected fields, including the receipt table and complete RPC signature.
No other pre-existing working-tree changes were modified.
