# Verified native41 generated clients

Both app public-schema files were published unchanged from two executions of the
pinned official postgres-meta entrypoint (`npm run --silent gen:types:typescript`),
revision `ecc19497dcfcb4dc6a83d02e49d812f747cbf981`, Node v22.22.2.

- Outputs: `apps/web/src/lib/supabase/database.types.ts` and
  `apps/mobile/src/lib/supabase.types.ts`.
- Both files in both runs SHA-256:
  `1ba3a8ab5fb3bdce1afd8bc5bb9369aaa9d6a184be9db4e7ab7c425d553acb6b`.
- Generator script unchanged, SHA-256:
  `c9df693fae84a253a3cabb5e924b09d0b1ef1066c2b68576a83f72ade17aa16e`.
- Independent approved schema evidence:
  `/home/eiat/.hermes/cache/scratch/r5b-native-8c52na3p/tablet_batch_77225-manifest.json`,
  82 successful steps, 41 exact checkout migration hashes. That test database
  contains **two synthetic notice approvals**, not operational approvals.
- To avoid fixture contamination, generation instead used newly constructed
  `st02_typegen_41_79300`, on the same disposable native PG16 UNIX socket.
  Captured bootstrap and all 41 migrations were applied in order, individually
  with `ON_ERROR_STOP=1` and single transactions, without application fixtures.
  The pristine notice registry was checked empty and read back as zero.
- Construction manifest (44 successful construction/check steps, **not** a new
  execution of the independent 82-step behavior suite):
  `/home/eiat/.hermes/cache/scratch/typegen-native41/manifest.json`, SHA-256
  `12aa0b54e095f98ba402f6ddcdc5d0bc04dc766b8789deb0c7f2c1c94bb18f74`.
  Its migration inventory exactly matches both checkout and approved evidence;
  captured inputs were compared with checkout after construction.
- Scratch construction script: `/home/eiat/.hermes/cache/scratch/typegen-native41-build.py`.
  Captured SQL and actual execution logs are under `typegen-native41/inputs` and
  `typegen-native41/*.log` in that scratch directory.
- Separate official run provenance: `typegen-native41/run-1-provenance.json` and
  `typegen-native41/run-2-provenance.json`; comparison: `reproducibility.json`.

## Exact generation command (executed twice)

From `/home/eiat/projects/e-bicycle-manual-st02`:

```sh
PG_META_DB_URL='postgresql://eiat@localhost:55439/st02_typegen_41_79300?host=/home/eiat/.hermes/cache/scratch/r5b-native-8c52na3p/socket' \
TYPEGEN_MIGRATION_MANIFEST=/home/eiat/.hermes/cache/scratch/typegen-native41/manifest.json \
python3 scripts/generate-native-database-types.py
```

## Verification

```sh
pnpm exec turbo run typecheck --force
pnpm --filter @glide/web exec jest --config ./jest.config.js --runInBand --runTestsByPath src/lib/supabase/schema-contract.test.ts
pnpm --filter @glide/mobile exec jest --config ./jest.config.cjs --runInBand --runTestsByPath src/lib/schema-contract.test.ts
pnpm exec turbo run test --force
```

All four workspace typechecks passed without cache; both standalone schema
contracts passed. Forced root tests passed: 65 suites, 483 tests across four
workspaces. An initial targeted web invocation used the wrong contract path and
found no tests; the corrected explicit command above passed. Mobile emitted the
existing Node punycode deprecation warning, with no failing tests.

No generator script or migration edits, handwritten type modifications, hosted
writes, Docker, sudo, PGlite, or commit. Other agents' existing dirty files were
left untouched. Public API, hosted admission, notices, and release gates remain
**closed**; generated type availability is not permission to invoke private RPCs
or an operational rollout approval.
