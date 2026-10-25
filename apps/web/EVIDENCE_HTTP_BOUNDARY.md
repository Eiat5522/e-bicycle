# Evidence HTTP fail-closed boundary (uncommitted)

API08 remains incomplete. No upload/reservation/attachment success is exposed.

## Execution boundary

`20260728200000_add_private_evidence_groundwork.sql` and
`supabase/tests/ST02_PRIVATE_EVIDENCE_NATIVE.md` define owner-only private
functions; PUBLIC, anon, authenticated and service_role have no execution grants.
The existing admin Supabase client is not an owner transport. No configured,
approved owner transport or real signed-upload issuer was found in the application
integration. No grants, schema, policies, credentials or storage settings were added.

Both exported POST handlers validate JSON and invoke the real staff/device/station
guard. Authorized well-formed requests return uncached 503
`EVIDENCE_CAPABILITY_UNAVAILABLE` without workflow RPCs, reservations, storage
operations or writes. Guard staff/device reads are intentional and distinct from
workflow operations. There is no guessed URL, TTL or fabricated upload success.

`EvidenceLocalVerificationAdapter` is a server-construction-only **read/local-check
seam**, not an implemented owner connection, upload issuer or finalizer. Its
authorizer must bind the verified actor/staff/device/station within the trusted
owner transaction and reauthorize the private reservation/parent. Production
routes deliberately do not configure it. No environment toggle enables it.
The injected route checks the returned reservation identity against the real
guard context and calls the existing `verifyEvidenceStorageBytes` implementation.
Even valid bytes result in 503 `STORAGE_VERIFIER_UNAVAILABLE`; LOCAL_BYTE_CHECK_ONLY
cannot create attachments, return an attachment ID, or return linked=true.
No caller-supplied UNCHECKED/state field substitutes for reading bytes.

## Explicit draft transport requirements

These fail-closed handlers require additions not present in the historical product
spec request examples; they are not claims of a finalized public success contract:

- Both requests require deviceId (opaque registered device identifier), stationId,
  parentLocalId, evidenceLocalId, parentKind and lowercase sha256.
- parentKind is one of rider_registration, rental_start, rental_return, matching
  the private groundwork's supported parent domain.
- Init also requires kind, mimeType and positive safe-integer byteSize.
- Complete also requires reservationId (independent server reservation primary ID)
  and uploadedAtDevice. It never uses evidenceLocalId as private p_id.
- Device wire identifier is used by the guard; the resulting database device UUID
  is used to bind reservations. Claimed staff/actor disagreement is denied.
- Actual signed target issuance, expiry and reservation response contracts need
  approval and implementation before init can be enabled.

## Executed local evidence

- Initial real-guard regression run: 10 failed / 14 passed (24 tests), reproducing
  invalid init wire-ID rejection and completion's empty guard inputs.
- Next byte-path regression run: 4 failed / 33 passed (37 tests), before adding
  bounded generic 422 byte-rejection mapping.
- Standalone init: 16 passed. Standalone complete: 33 passed.
- Combined route + existing verifier: 3 suites / 106 tests passed.
- Full web: 37 suites / 382 tests passed. The obsolete unconditional-auth/mock-RPC
  success tests were replaced, not retained as evidence; 377 is not the new total.
- Web typecheck passed. Web lint passed with 12 warnings, none in the five changed
  code/test files. Web production build passed (Next workspace-root warning).
- git diff --check passed. No hosted tests/writes, commit or push.

Self-review inspected both exported handlers, server seam, source call sites,
identity comparisons, local-only return paths and task delta. No secrets, eval,
shell injection or service-role evidence RPC remain in the changed code. This is
implementer self-review, **not independent reviewer approval**. Parent/controller
must arrange any separately required exact-candidate independent gate.

The installed Next package did not include the AGENTS-referenced dist/docs guide;
actual Next 16 build and generated route checks were exercised instead.

## Open gates

Approved owner execution transport, evidence MIME/size/TTL policy, production
storage adapter with provider attestation/immutability, signed uploads,
transactional parent/version revalidation and attachment linkage, real upload E2E
and hosted acceptance remain unimplemented/unverified. Synthetic BMP bytes and
policy in tests are not business/provider approvals. Existing SQL, generated,
mobile and shared files were not edited by this task.

## Exact changed code/test SHA-256

- `apps/web/src/app/api/staff-tablet/evidence/init/route.ts`: `5ee7d2bcb3bd886fb377f6dff582de7d0fc0eee7b639a8530c18e1e445cb1379`
- `apps/web/src/app/api/staff-tablet/evidence/init/route.test.ts`: `76b4379aae95070b5c62bf0fed23e3e9539836fbb6f56877e478b1ce621d23a7`
- `apps/web/src/app/api/staff-tablet/evidence/complete/route.ts`: `50afe8f62bd01e7a595b99aedddc3ed69e36f6cc60b0976a8a72d7e9cbfb553f`
- `apps/web/src/app/api/staff-tablet/evidence/complete/route.test.ts`: `f7fc3d8914f75e377d90ef475e90c721b234b6e7eb0d5e9f75560516dd7fba02`
- `apps/web/src/lib/staff-tablet/evidence-http.ts`: `6b46ac32a949a172e7d7efa1bc9f44896c18eac7ab1a0c95f79fe23df61e2f14`

Base HEAD: `c8584bb63d2dda302e80b484c512272d503d54ee` (dirty worktree; not a new commit).
