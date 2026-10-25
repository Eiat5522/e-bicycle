# Private evidence reservation and local byte-check groundwork

This is a bounded owner-only slice toward **ST-API-08**, not API08 completion.
Spec reference: `docs/product-design/staff-tablet-implementation-spec.md:562–615`;
ticket reference: `staff-tablet-implementation-tickets.md:257–283`.

## Scope

- Additive migration `20260728200000_add_private_evidence_groundwork.sql`;
  all preceding 41 migrations remain byte-preserved, including 190000 SHA256
  `d12480d8b38b9d206ad0c8d790bde497a75e7319bb4609afa65500feb38944cf`.
- Private reservation key `(device_id,evidence_local_id)`. Actor, staff and station
  derive from current authorization. Original raw request, evidence kind, parent
  local identity, declarations and server-generated opaque object key are immutable.
- Owner-only internal request uses `deviceId`, `evidenceLocalId`, `parentLocalId`,
  `parentKind`, `kind`, `declaredMime`, `declaredSize`, `declaredSha256`. This is NOT
  the HTTP request contract. Unknown keys (including URLs/claimed staff) are denied.
- Empty policy registry: no production MIME allowlist, limit, TTL, signing or
  storage policy is invented. Synthetic test policy rows are not approvals.
- Before sync, an absent parent receipt permits reservation. Existing receipts
  must be accepted, same actor/staff/device/station/kind and map to the exact
  canonical rider/start/return ledger tuple. Unsupported parent kinds are denied.
- Exact raw retries preserve reservation ID/object key; changed raw requests conflict.
  Current authorization and any existing parent receipt are rechecked on retries.
- Byte helper computes actual `octet_length(bytea)` and SHA256. It compares both
  to declarations, storing observed fields separately. Successful checks mean
  **LOCAL_BYTE_CHECK_ONLY**, not MIME sniffing, Storage verification or upload.
- Completion always reauthorizes and requires the canonical parent, including on
  replay. It then raises `STORAGE_VERIFIER_UNAVAILABLE`; no attachment ID, linked
  flag or Storage success is fabricated. No attachment writes occur.
- All new tables/functions deny PUBLIC, anon, authenticated and service_role.
  Existing private batch evidence rejection is unchanged.

## Native gate

```sh
python3 supabase/tests/st02_evidence_native.py
```

Uses the existing isolated PostgreSQL 16 harness configured by
`ST02_NATIVE_WORKSPACE` (same default as the batch runner). No hosted writes,
Docker, sudo or PGlite. Captures full migration/test inventories, executable
bootstrap, configuration and runtime bytes before imports/SQL; executes captured
bytes and verifies inventories/content afterwards, including failure paths.

The 42-migration chain runs initial/replay evidence tests plus all original batch,
station/start/return/mobile SQL, mutation controls, lock races, bounded deadlock
retry and input-freeze unit gates. Evidence tests include empty policy, limits,
URL rejection, absent/foreign/null/inactive identity, unresolved parent admission,
missing-parent completion, receipt/canonical mismatches, actual role-denied DML
and helper execution, real byte size/hash mismatches, stable retry, immutable
metadata, repeated fail-closed completion, and full-row rollback snapshots after
late reservation/byte-update failure. Separate psql sessions observe
`pg_blocking_pids` for exact and changed reservation races and assert one row.

No public routes, application/shared code or generated types are part of this
slice. Still missing: real Storage object verifier, trusted MIME detection,
production-approved policy/configuration, signed upload targets, attachment
linkage, parent needs-evidence state, HTTP authorization/validation and end-to-end
upload acceptance. API08 remains incomplete; public admission stays closed.
