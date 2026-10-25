# API08 local Storage candidate — acceptance incomplete

## Resumed acceptance status (2026-10-21)

This section supersedes the historical scope/status sections below. The current
candidate includes the explicit local native owner, transactional PostgreSQL byte
snapshot/linkage migration, HTTP workflow and real-Storage harness. **API08 is not
complete. Production success remains disabled.** No provider WORM, approved
retention/policy, full Auth/PostgREST integration or hosted readiness is claimed.

Worktree: `/home/eiat/projects/e-bicycle-manual-st02`; branch
`manual/st02-recovery`; HEAD `c8584bb63d2dda302e80b484c512272d503d54ee`.
The 24-file source manifest was rehashed without drift from the prior post-fix
candidate: aggregate SHA-256
`3cc9c69e7e6b39d6e283ba3fce2bb95980d6246d26cc834f57c6380802254624`.
Exact per-file hashes: `/home/eiat/.hermes/cache/scratch/api08-resume-source-manifest.json`.
This resume changed this document only, not implementation sources. No commit,
push, hosted write, deployment or unrelated dirty-source edit was performed.

### Acceptance matrix

| Gate | Verified evidence | Disposition |
| --- | --- | --- |
| Forced unit tests | `api08-final-quality-v4.log`: 70 passed suites / 636 passed tests; web 39 / 429, mobile 26 / 188, shared 4 / 11, API 1 / 8. Storage integration separately skips 1 suite / 3 tests without explicit config. | PASS for unit gate; skipped Storage tests are not E2E evidence |
| Typecheck / lint | Exact requested serialized forced command exited 0; 12/12 tasks successful, no cache hits. Lint 0 errors / 13 warnings. `git diff --check` separately exited 0. | PASS |
| Build | Older build evidence below belongs to an earlier candidate. No current-candidate build rerun with D: at 1.4 GB free. | OPEN |
| Native historical 42-migration gate | `evidence_790734-manifest.json`: 42 migrations / 87 steps, zero failed exits, post-freeze verified. All recorded migration hashes still match. | Historical PASS, not rerun this resume |
| Fresh final native gate | `evidence_durable_60087-manifest.json`: new disposable DB, 43 migrations / 88 steps, all exit 0, pre/post source/runtime freeze verified. Includes initial/replay durable tests and historical concurrency adapters. | PASS |
| Real Storage / native / HTTP | Prior `storage_http_31683/manifest.json`: passed true, 11/11 steps exit 0, 3/3 integration tests executed, source freeze true; current TypeScript inventory matches. It explicitly reused native state. | Historical PASS only; required fresh-state rerun BLOCKED |
| Independent exact-candidate review | `api08-final-independent-review.json` does not exist. Final log ends at provider usage limit; no verdict was returned. | OPEN; do not infer PASS |

All evidence paths above are under `/home/eiat/.hermes/cache/scratch/`; native
manifests are under its `r5b-native-8c52na3p/` directory.

Quality log SHA-256:
`fc2945af98783fa1631cb090decffd6167c4c69b5543769813126637fb462db9`.
Fresh native manifest SHA-256:
`daaa229d7a0e149a59f92d2f35a275585eb481c963d14f1fc96b7c08c955b907`.
Historical native42 manifest SHA-256:
`2a59a4fb309da94a3244336a9f7db461e308c423a1fa28539c03260752d8c82a`.
Historical actual-Storage manifest SHA-256:
`b899d230326d6c6e4a29142d84582c4c15652fe6e18a9a11e45df865ceb324fe`.

### Blocking review findings, verbatim

The final review log has no completed findings/verdict. Its terminal blocker is:

> ERROR: You’ve hit your usage limit. Upgrade to Pro (https://chatgpt.com/explore/pro), visit https://chatgpt.com/codex/settings/usage to purchase more credits or try again at 9:18 AM.

The earlier completed `api08-independent-review.json` contains these findings:

> Adding station entities to public.attachments also enables the existing authenticated INSERT policy, which permits self-owned or null-uploader attachments without validating the parent or station. Users can fabricate attachments against arbitrary station rentals/riders. This does not satisfy private durable requirements, but bypasses the owner-only attachment boundary.

> Embedded evidenceLocalIds are converted to text without validating each element. With a nonempty reference list, a JSON null produces SQL NULL; the membership check at line 48 then skips rejection. Malformed inspection/payment references can therefore reach canonical processing.

Current source contains restrictive client attachment policy plus owner trigger,
and typed/null-safe/de-duplicated embedded-reference checks. Fresh native tests
exercise these regressions. **Independent remediation approval remains open.**
All earlier findings, required fixes and suggestions are preserved verbatim in
`api08-resume-blocking-findings.md` in scratch.

### Actual-Storage attempt differences and fresh-run blocker

The requested `api08-actual-storage-attempt1.log` is absent. The separately named
initial `api08-actual-storage.log` fails on duplicate synthetic auth-user fixture
identity. Attempt 2 fails on unsupported `rootlessctl --proto`; attempt 3 reaches
HTTP tests but bucket creation fails; attempt 4 passes after the harness's local
schema-usage/bootstrap corrections. Adjacent full log diffs are retained in
`api08-resume-storage-attempt-diffs.patch` in scratch; missing attempt1 is not
silently replaced with fabricated evidence.

A new storage runner invocation explicitly unset `API08_EXISTING_LOCAL_STATE`.
It created a new `storage_http` run directory but exited 1 at
`pinned-image-present`: the owned Docker socket
`/home/eiat/.hermes/cache/scratch/api08-rootless/docker.sock` is absent. Log:
`api08-resume-storage-fresh.log`. No actual Storage test executed in that run.

The WSL filesystem reports virtual free space, but its Windows D: backing drive
has only **1.4 GB available**. Do not start VFS container copies, large downloads
or builds on that headroom. Required user action: free backing-drive space or
expand/move its storage, then allow restarting the owned rootless Docker daemon.
After health/image verification, rerun the Storage harness with fresh disposable
native/storage state and no reuse variable. No image pull is needed if the pinned
image remains present. Do not delete unrelated data to create headroom.

### Guarantees checked versus still open

- Prior real-Storage tests demonstrate that privileged staging overwrite/delete
  is possible; they do **not** establish immutable provider objects. Replay uses
  immutable application PostgreSQL snapshots. Native SQL rejects blob and
  requirement UPDATE/DELETE/TRUNCATE and linked-attachment UPDATE/DELETE.
- Replacement before completion is rejected by hash verification (HTTP 422, no
  receipt); post-completion staging changes do not alter the committed snapshot.
  These are not claims of provider conditional-read/version attestation or a
  newly executed fresh-Storage TOCTOU race proof.
- Native completion reauthorizes actor/device/station and locks/revalidates the
  canonical parent in its transaction; tests cover disabled-device and changed
  canonical-parent rejection plus rollback after late linkage failure. The prior
  real-Storage harness covers revocation between authorize/finalize, same-file
  and different-required-file completion, pending-state preservation and replay
  after staging deletion. HTTP authentication is explicitly mocked.
- Do not issue provider-dependent review until the user's stated subscription
  reset has elapsed/been confirmed. The earlier log's 9:18 AM text is historical,
  not permission to override the new approximately 50-minute restriction. No
  provider-dependent review was issued during this resume.
- After disk recovery, obtain fresh real-Storage acceptance and a current build,
  then independently review the exact final manifest before declaring completion.

### Key execution source provenance (SHA-256)

```text
c0fc9026694a16d19766b0008abaa666aba1645cf160e5ccc1f1d84138ffdc22  supabase/migrations/20260728210000_add_private_evidence_durable_linkage.sql
7f2ba36776ff4764249cff41a5b1d696ed92ecdcd209364f6365c1dd8da49171  supabase/tests/st02_evidence_durable.sql
1cff3bea2ef6bf736957709dcd4c01726787fea8e97b6498ad41449ed37d054f  supabase/tests/st02_evidence_durable_native.py
13b10210d5112ce188be3eb5328408c79d6cb8bc9f20c499c888a0c11228687a  supabase/tests/st02_evidence_storage_native.py
41ec9c13f2a09209ca188a1189ac3a14376bb1e0d3c64818062d76d7b8dd4388  apps/web/src/lib/staff-tablet/evidence-owner-native.integration.test.ts
477770805bea160d74a870208d97776b262272b5274abc97d11b8fd705311c10  apps/web/src/lib/staff-tablet/evidence-supabase-local.ts
```

## Historical candidate notes (not current acceptance)

## Scope and disposition

This candidate adds only `src/lib/staff-tablet/evidence-supabase-local.ts` and its
adjacent test. No existing route, guard, migration, generated type, sync processor,
Storage bucket/policy, environment configuration or unrelated dirty source was
modified. No commit, push, hosted deployment or hosted write was performed.

**API08 remains incomplete. Production success stays disabled.** The exported
routes still return 503 after authorization; existing private functions remain
owner-only and completion remains unavailable. This module is deliberately not
wired into a route, cannot finalize an attachment, and cannot elevate verification
above `LOCAL_BYTE_CHECK_ONLY`.

## Implemented capability

- Server-only, explicit-construction Supabase Storage REST adapter restricted to a
  literal `http://127.0.0.1[:port]` origin. Hosted origins, credentials in URLs,
  alternate IPv4 spellings, URL paths and redirects are rejected.
- No policy defaults. Caller must provide supported MIME allowlist, positive byte,
  timeout and chunk budgets, and explicit signed-upload lifetime. Current image
  validation remains the existing narrow complete-raster BMP validator; JPEG/PNG
  support or approval is not claimed.
- A bounded authenticated Storage download creates a private, single-use,
  expiring in-memory snapshot. Existing byte verifier hashes/validates that actual
  snapshot. A later source-object overwrite cannot change those checked bytes.
  `local-snapshot:` is an application handle, **not a provider version**;
  `conditionApplied` means local handle selection, not HTTP conditional-read
  attestation. This is not durable immutability or TOCTOU-safe attachment linking.
- Local signing request follows installed official storage-js REST shape:
  POST `/object/upload/sign/{bucket}/{opaque-key}`, empty JSON body, explicit
  `x-upsert: false`, authorization/apikey headers. Returned URL must target that
  exact local bucket/key with a token. No client URL selects a download target.
- Noncooperative network requests, chunk floods and oversized downloads fail
  closed. Timeouts bound the caller; AbortSignal cooperation is still necessary
  to stop underlying work. Late HTTP response bodies are cancelled.

## Official capability findings and decisions

Sources retrieved directly during this task:

- https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl
  documents signed upload URLs valid for **two hours**. The installed official
  storage-js implementation accepts `{ upsert }`, not an expiry argument, and
  controls it with `x-upsert` at signing time. Therefore this adapter accepts only
  an explicitly configured 7200 seconds and rejects shorter claimed lifetimes.
  A short database reservation deadline does not revoke a still-valid upload URL.
- https://supabase.com/docs/guides/storage/uploads/standard-uploads documents
  first-writer behavior without upsert and last-writer behavior with upsert;
  neither is a guarantee against later privileged update/delete.
- https://supabase.com/docs/guides/storage/security/ownership explicitly says
  object ownership alone supplies no access control.
- https://supabase.com/docs/guides/storage/security/access-control says service
  keys bypass RLS. Thus RLS and server ownership alone are not provider WORM.
- https://supabase.com/docs/guides/storage/schema/design says object bytes live
  outside PostgreSQL and Storage mutations must use Storage APIs. Locking a
  `storage.objects` metadata row is not proven to atomically bind external bytes.

No fundamental impossibility of implementing API08 is established. However,
these documents do **not** establish durable provider immutability or an atomic
Storage-copy/PostgreSQL-link transaction. Do not advertise those guarantees.

Separate approval/implementation decisions still required:

1. Approve MIME types, per-type/total byte limits, retention, reservation expiry
   and whether the provider's fixed two-hour signed-upload lifetime is acceptable.
   If shorter revocable upload capability is mandatory, choose a reviewed proxy
   upload transport rather than inventing a signed-upload TTL.
2. Choose durable byte binding: reviewed server-only final namespace plus readback
   and access controls (with an accurately stated privileged-write threat model),
   or a transactional PostgreSQL byte snapshot bound to the attachment. The
   latter duplicates Storage content and needs explicit storage/retention approval.
   Downloading into memory alone does not implement either final design.
3. Implement/review the actual owner connection with transaction-scoped verified
   actor/device/staff/station binding. Existing service-role PostgREST client is
   not such a connection. Do not solve this with broad grants.
4. Implement transactional parent revalidation, canonical attachments, atomic
   idempotent completion receipts and required-evidence pending-state updates.
5. Exercise real local Supabase Storage issuance/upload/download/mutation races
   and independent exact-candidate review before considering hosted enablement.

## Actual local verification

- New adapter suite: 17 tests. Behavioral RED controls reproduced unsupported
  signer payload/header (1 failure/14 passes), then normalized IPv4 acceptance
  (2 failures/15 passes), before fixes. Initial missing-module run was a separate
  module-loading failure, not a behavioral RED claim.
- One test uses a real ephemeral loopback HTTP server and downloads bytes; source
  replacement after pin still passes the existing full byte verifier. This server
  is synthetic, **not Supabase Storage**. Signer/error/budget tests inject fetch.
- `pnpm exec turbo run test typecheck lint build --force` exited 0: 16/16 workspace
  tasks, 69 suites / 613 tests. Web 38 suites / 406 tests; mobile 26 / 188;
  shared 4 / 11; API 1 / 8. Lint 13 warnings (12 web, 1 mobile), zero errors,
  none in the two new files. Build warns about workspace lockfiles and punycode.
  Log: `/home/eiat/.hermes/cache/scratch/api08-local-quality.log`, SHA-256
  `dfe86748096dbb6d879d208afa4e8f2f058444a33e87c3d5220c5cf658a81c47`.
- `python3 supabase/tests/st02_evidence_native.py` exited 0: actual existing
  42-migration native PG history, initial/replay and concurrency checks, 87 recorded
  steps / zero failed steps, pre/post input freeze verified. Manifest:
  `/home/eiat/.hermes/cache/scratch/r5b-native-8c52na3p/evidence_790734-manifest.json`.
  This verifies preserved owner-only/fail-closed SQL, **not new attachment linkage**.
- `git diff --check` passed. Web standalone typecheck passed.
- Docker binary exists but `docker info` cannot connect to its daemon at
  `/run/user/1000/docker.sock`. Actual local Supabase Storage integration was not
  available or exercised; native PostgreSQL is not a replacement for that gate.
- One attempted full-web command used an extra `-- --runInBand` and matched no
  tests; corrected full forced workspace execution above passed.
- Self-review only. Parent must independently review exact candidate; no
  independent approval is implied.

## Independent-review follow-up: local lifecycle and signer validation

The verification above records the initial candidate, not the revised source below.
This follow-up changes only the adapter, adjacent tests and this document.

- Overlapping pending pins reject before network IO. A later sequential pin clears
  the old timer and explicitly zeroes the old snapshot before downloading; the old
  expiry therefore cannot dispose the replacement. Snapshot expiry/read consumption
  clears bytes without terminating the adapter.
- Explicit `dispose()` is terminal and idempotent: zeroes the retained snapshot,
  aborts active requests and rejects all later pin/read/sign operations. Pending
  callers reject without waiting for uncooperative transport/reader cancellation.
  Late response bodies are cancelled, late reader values and copied chunks are
  zeroed on completion, and a post-await guard zeroes data rather than publishing
  after disposal. Already returned read streams are caller-owned and not recalled.
  Uncooperative work cannot be forcibly stopped; unreachable provider buffers and
  runtime/transport copies cannot be claimed securely erased.
- Signed URLs require exactly one nonempty token, no other query keys, and no
  fragment delimiter (including an empty fragment). Encoded duplicate names reject.
- Deterministic deferred-fetch/deferred-reader and fake-timer regressions exercise
  overlap rejection, replacement zeroization, old-expiry isolation, terminal
  disposal, late response cancellation and late reader zeroization.

### RED/GREEN and final checks

All commands ran at `/home/eiat/projects/e-bicycle-manual-st02`.

`pnpm --filter @glide/web test evidence-supabase-local.test.ts`:

1. Overlap RED: 1 failed / 17 passed; second deferred pin incorrectly resolved.
   GREEN after serialization: 18 passed.
2. Disposal RED: 2 failed / 18 passed; pending signal remained live and late bytes
   remained nonzero (also exposed the first test's late successful continuation).
   GREEN after terminal disposal/fencing: 20 passed.
3. Signer RED: 5 failed / 22 passed; duplicate tokens and fragments resolved.
   Empty/missing-value tokens already rejected. GREEN in final focused run below.

Final commands, all exit 0:

- `pnpm --filter @glide/web test evidence-supabase-local.test.ts evidence-storage-verifier.test.ts`
  — 2 suites / 91 tests passed (adapter 27, verifier 64).
- `pnpm --filter @glide/web test` — 38 suites / 416 tests passed.
  Log: `/home/eiat/.hermes/cache/scratch/api08-review-full-web.log`.
- `pnpm --filter @glide/web typecheck` — passed.
- `pnpm --filter @glide/web lint` — zero errors, 12 pre-existing warnings outside
  the adapter files.
- `git diff --check` — passed; untracked adapter/doc whitespace also checked directly.

No commit, push, hosted write, production wiring, native SQL rerun or actual
Supabase Storage integration was performed in this follow-up. Local HTTP remains
synthetic; API08 remains incomplete. Byte hashes and lifecycle tests establish
neither durable provider immutability nor transactional attachment linkage.
Before/after source fingerprint comparison found no unrelated source edits;
Jest caches and TypeScript incremental build metadata changed during validation.

### Revised exact-source SHA-256

```
a623d7065c72eb3a88a86973d3eca6676e151a7889c94f4d551a7393881548a8  apps/web/src/lib/staff-tablet/evidence-supabase-local.test.ts
477770805bea160d74a870208d97776b262272b5274abc97d11b8fd705311c10  apps/web/src/lib/staff-tablet/evidence-supabase-local.ts
```

Before this follow-up the corresponding hashes were
`921cd1e8b81d4fa69c2e38f8bccfc0a6103a175372070c22d10bae6175cba8ee`
and `53d30c34549b53bc4afd9a3e3a64e61baeebd6ec426587105403a8200ac297df`.
The original scratch manifest is historical and was not regenerated.
