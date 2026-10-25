# Verified native42 generated clients

Actual public-schema generation ran twice against pristine native PostgreSQL 16 database `st02_typegen_42_96360`, not against the fixture-bearing behavioral-test database. Both app outputs were published directly by unchanged `scripts/generate-native-database-types.py` using official postgres-meta revision `ecc19497dcfcb4dc6a83d02e49d812f747cbf981`. No handwritten types.

- Outputs: `apps/web/src/lib/supabase/database.types.ts`, `apps/mobile/src/lib/supabase.types.ts`.
- Both actual runs and both outputs SHA-256: `1ba3a8ab5fb3bdce1afd8bc5bb9369aaa9d6a184be9db4e7ab7c425d553acb6b`. Bytes equal native41; this is observed regeneration, not inferred compatibility. New 42-input provenance is retained separately.
- Independent approval manifest: `/home/eiat/.hermes/cache/scratch/r5b-native-8c52na3p/evidence_92902-manifest.json`, SHA-256 `846d1b02360054aa5b20fb570ef754ba5f536b5fa1793d83ea9547c6df340bde`; 87 successful recorded steps. This checkpoint did not rerun that behavioral suite.
- All 42 checkout migrations match that approval inventory exactly. Actual `20260728200000_add_private_evidence_groundwork.sql` SHA-256 is `ce439fac1c2977178189387f9af614afc8b4869af719109bc6d1fab24c7a29c1`. Historical review fingerprint beginning `9546` is not this approved input and has not been normalized or silently substituted; the discrepancy is resolved by matching the actual checkout and frozen manifest.
- Scratch root: `/home/eiat/.hermes/cache/scratch/typegen-native42/`.
- Construction manifest `manifest.json`, SHA-256 `ab61a9b66d6e265419ec6229a379a2d3534cc6bd7a5ccdc0c14333d462a25e2e`: 48 successful construction/inventory/check steps, not 48 behavioral cases. Captured bootstrap and all 42 frozen migrations applied individually with `ON_ERROR_STOP=1`, single transactions, no application fixtures. Both `private.station_approved_notices` and `private.station_evidence_policy` read back empty.
- Scratch runner: `/home/eiat/.hermes/cache/scratch/typegen42-run.py`; exact captured inputs and SQL logs in scratch root. `run-1.log`, `run-2.log`, `run-1-provenance.json`, `run-2-provenance.json`, and `reproducibility.json` retain separate run evidence.

## Reproduction

From `/home/eiat/projects/e-bicycle-manual-st02`, executed twice:

```sh
PG_META_DB_URL='postgresql://eiat@localhost:55439/st02_typegen_42_96360?host=/home/eiat/.hermes/cache/scratch/r5b-native-8c52na3p/socket' \
TYPEGEN_MIGRATION_MANIFEST=/home/eiat/.hermes/cache/scratch/typegen-native42/manifest.json \
python3 scripts/generate-native-database-types.py
```

## Final local gates

`gate-0.log` through `gate-7.log` and machine-readable `gates.json` in scratch root record exit 0 for every command:

1. `pnpm exec turbo run typecheck --force`: four workspace tasks, zero cache hits.
2. `pnpm exec turbo run test --force`: 65 suites / 483 tests (shared 4/11, API 1/8, web 34/276, mobile 26/188), four tasks, zero cache hits.
3. `pnpm exec turbo run lint --force`: four tasks, zero cache hits; nine warnings, no errors (one mobile useless constructor; eight web unused-variable warnings).
4. `pnpm exec turbo run build --force`: four tasks, zero cache hits. Next workspace-root/multiple-lockfile warning and Node punycode deprecation; mobile test run also emitted punycode deprecation.
5. `python3 -m unittest discover -s scripts/tests -v`: 18 passed.
6. `python3 -m unittest discover -s supabase/tests -v`: three input-freeze tests passed.
7. `python3 -O -m unittest discover -s scripts/tests -v`: 18 passed.
8. `python3 -O -m unittest discover -s supabase/tests -v`: three passed.

Both standalone web/mobile schema-contract suites also passed (`schema-web.log`, `schema-mobile.log`). Final `git diff --check` passed. Added-line plus 52 untracked-text-file secret/unsafe-code scan found zero matches for private keys, provider keys, quoted assigned secrets, shell injection and unsafe deserialization (`final-scan.json`); matched content was never printed. This bounded pattern scan is not a comprehensive security audit. `source-before.json` and `source-after.json` show zero byte drift excluding intentionally owned generated types and checkpoint/provenance documentation. All migrations and generator source remain unchanged.

No migration or generator edits, hosted writes, HTTP sync implementation, deployment, merge or new commit. Local compilation and generated types do not authorize private RPCs or operational policies. Public bootstrap stays fail-closed 503; real Storage verification and approved notice/offline/pricing/evidence policies remain absent. Not ready for manual acceptance testing.
