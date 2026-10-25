# Bounded private station return — native evidence

This is an internal owner-only processor, **not completed ST-API-06**. No public wrapper, execution grant, policy approval seed, fare/payment settlement, rentable release, hosted write, application change or generated type change is included.

## Implemented scope

`private.station_return_rental(uuid,uuid,jsonb)` derives active staff/device/station via `station_actor`, serializes device and exact business rental identity, and locks the canonical bike. Same device-local identity and exact payload replays once; changed payload or a second return identity conflicts. Unmatched, cross-station and override paths reject without releasing the bike. Passing inspection holds `returned_pending_inspection`; failed inspection requires notes and writes private blocking context atomically with maintenance status. Existing maintenance/out-of-service quarantine cannot be cleared. Server audit and status event use the authenticated profile and staff identity. Station riders remain separate from mobile ownership; no synthetic completed mobile transaction is written.

`private.station_return_blocks` is deliberately honest private maintenance/blocking context, not an invented row in a legacy incident schema. Its optional incident-local reference is not proof that an incident or evidence has synced.

## Verified execution

Command: `python3 supabase/tests/st02_station_start_native.py`

Final native PostgreSQL **16.15** database: `station_start_57255`.
Manifest: `/home/eiat/.hermes/cache/scratch/r5b-native-8c52na3p/station_start_57255-manifest.json`.
Input freeze: same directory, `station_start_57255-input-freeze.json`; captured execution tree: `station_start_57255-inputs/`.

- Full 40-migration chain; unique 14-digit versions. All 38 foundation hashes preserved.
- Identity `b3f9814eec78f96d67707746aad6565bd32ca850e7b6f39a4ee81f177889280a`, start `e8a75a8e134c2d60c1326c5fdf4b893bbe0c5ea5126d9aeb67d16da72fe6b1c3`, return `fc06779a18402fa1da0310732f2be82541fc2d7b57ecde4055d3dd35ac3bc4c7` preserved and checked **before any SQL/bootstrap**.
- **64 execution inputs** frozen before configuration parsing/local helper import/SQL: 40 migrations plus 24 SQL/Python/JSON test/support inputs. **2,989 external runtime/configuration paths** hashed before execution and compared afterwards, including `env.json`, the Python executable and the harness `pgroot` runtime tree. Inventory additions/removals also fail closed.
- Execution uses captured migration/test/helper bytes, not a second read of mutable source. Repository and captured source inventories and external runtime are checked in `finally`; failures cannot emit a successful manifest. Child processes receive an explicit non-secret environment, not arbitrary inherited Python/PG/loader settings.
- Clean bootstrap and 38-hash foundation are now repository-owned `support/native_bootstrap.sql` and `support/foundation_hashes.json`. Neither scratch `chain.py` nor an external historical foundation manifest is consumed. The exact effective bootstrap is retained in the captured tree; SHA-256 `fc400c8542cd3580da0ad7bc799505306cd052e61d0c1acd2c17e22e6b792ba7`.
- **71 successful recorded steps**: previous 64-step full-chain/initial/replay/ACL/concurrency gate plus seven real-SQL mutation/contamination controls. The 27 actual registry/helper/processor permission-denial statements still run.
- Six observed station contention orders: station-first, mobile-first, duplicate-start, return-first, start-first, duplicate-return; previous mobile completion recovery contention also passes.
- Start-first explicitly holds the bike row while a new-identity start rejects in a savepoint, then observes return waiting on that row. Return-first uses a different device/business identity for competing start, excluding device/advisory lock as the source of blocking.
- Added explicit old-return receipt replay while a newer rental is genuinely active, stale canonical-bike rejection, missing/blank failed-inspection notes, and manual-override denial. Full rental/bike/event/audit/block row snapshots prove no changes. Stale legacy canonical status is injected only during fixture setup with its guard disabled; the guard is restored before the processor invocation.
- Forced maintenance-context insertion failure now compares all five complete table states. Failed-inspection audit failure occurs after private block insertion and proves the block, event, audit, rental and bike all roll back.
- Seven negative controls transactionally remove the four relevant protections or contaminate event/audit/block rows; each must fail at its exact intended diagnostic. Approved migration files are never edited by these controls. The failing SQL transactions roll back on session close.
- Three durable stdlib freeze unit tests pass under normal Python and `python3 -O` (six executions): mutation of external/config/effective-SQL inputs, addition/removal, and external symlink rejection. Initial RED was the missing freeze helper; native negative controls independently demonstrate the SQL assertions catch their defects.
- `git diff --check` passed. No commit. No app/generated/migration edits by this verification change.

The native harness still requires a pre-existing local PostgreSQL socket, roles and PostGIS-capable runtime; set `ST02_NATIVE_WORKSPACE` to relocate its `env.json`/`pgroot`/`socket` workspace. This is content/inventory integrity evidence, not adversarial attestation or a hermetic operating-system/server-state image. Live database data, system Python standard library and OS libraries outside the captured runtime are not snapshotted. No hosted access or writes occurred.

The first native run exposed text-to-enum assignment errors; explicit `public.bike_status` casts fixed them before the final successful run.

## Still open before full API06/release

- Public HTTP/RPC/sync dispatch, accepted/conflict receipt persistence, dependency ordering and manager reconciliation UX.
- Approved evidence metadata/upload/attachment validation and retention; private raw evidence IDs are not verified evidence.
- Approved notice versions, policy/TTL/configuration, pricing and payment verification/settlement authority; none seeded.
- Cross-station/unmatched return and manual-override authorization/design; currently explicit rejection, not a reconciliation implementation.
- Canonical incident/maintenance/reporting/bootstrap/admin/payment readers integrating station ledger and private blocking context.
- Complete approved inspection matrix (this bounded slice rejects override/not-checked paths and never releases rentable), incident intake and maintenance-resolution lifecycle.
- Hosted acceptance, service-role integration, application/generated-type integration and independent review. Native-only evidence is not deployment or operational approval.
