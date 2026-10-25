# Staff-tablet route integration readiness

## Scope and current implementation

Reviewed `docs/product-design/staff-tablet-implementation-tickets.md`, its implementation spec and manual integration tasks. ST-API-01 (`03aefaf`) adds the sync schema. Despite its subject, ST-API-02 (`c588cf4`) adds `requireStaffTabletAccess` and its unit tests, not a registration HTTP endpoint.

The working tree now contains **GET `/api/staff-tablet/bootstrap`**. It calls the real query-context adapter, then the real access guard before invoking the snapshot service. The adapter requires single, unpadded, nonempty `deviceId` and `stationId` query values, and accepts one optional opaque `since` hint. It does not use `since` to omit unchanged rows or claim durable cursor semantics. Staff identity comes from the verified Bearer user, not a query field.

This is a **fail-closed scaffold, not a working bootstrap API**: every authorized request currently receives 503 `BOOTSTRAP_CONFIGURATION_UNAVAILABLE`. `loadStaffTabletSnapshot` always throws before constructing a snapshot client or reading snapshot data. `loadScopedCanonicalSnapshot` is a separately tested canonical subset loader, but is **not called by the endpoint** and cannot produce the full bootstrap DTO. Approved notice versions and offline access policy are missing; supplying configuration alone is insufficient. Complete, approved mappings/sources for every required dataset (including canonical active rentals, rider/payment state and safety data) remain necessary. Bike-owned ride markers are not canonical rentals; no fabricated IDs, policy values or empty-array completeness claims are acceptable.

All route response branches, including malformed queries, guard denials, bounded 503 and unexpected 500 errors, use `Cache-Control: private, no-store`. Returned guard/adapter errors are cloned before changing headers so their original headers/body remain untouched. Unexpected failures expose only the generic route message.

## Approved workflow inventory and remaining integrations

| Ticket | Endpoint / capability | Remaining work |
| --- | --- | --- |
| ST-API-02 | Register and authorize devices | Authorization guard and station-scoped enrollment RLS baseline exist. Define registration HTTP method/path, request/response and re-enrollment/identifier-collision/lifecycle contracts before adding an endpoint. An already-registered-device guard cannot authorize initial enrollment. |
| ST-API-03 | GET `/api/staff-tablet/bootstrap` | Guarded, uncached bounded-503 scaffold exists. Implement complete canonical station-scoped `StaffTabletBootstrapResponse` and approved configuration sources; wire the canonical loader only when all required datasets and failure semantics are defined. |
| ST-API-04–07 | POST `/api/staff-tablet/sync` and canonical processors | Implement durable batch/record receipt persistence, replay identity and concurrency, ordering, conflicts and canonical rental/return/payment/safety writes; the schema alone does not implement this API. |
| ST-API-08 | POST `/api/staff-tablet/evidence/init`, `/complete` | Implement allowlisted uploads, parent ownership, size/hash checks and attachment finalization. |
| ST-API-09 | GET `/api/staff-tablet/sync/status` | Implement revision/delta semantics and authorized conflict/receipt refresh. |
| ST-API-10 | GET `/api/admin/tablet-sync/conflicts`, PATCH `/:conflictId` | Implement admin/manager authorization, audited resolution and canonical effects; not a tablet-device enrollment endpoint. |
| ST-API-11 | POST `/api/staff-tablet/backup-export` | Implement record access checks and idempotent export audit; export must not imply canonical sync. |

Apart from bootstrap, these routes do not currently exist under `apps/web/src/app/api`. Unrelated admin/report/engagement/geofence routes are not substitutes. No placeholder bootstrap success is exposed.

## Enrollment baseline versus missing HTTP contract

Enrollment actor authorization is not wholly undefined: `20260727210000_add_tablet_sync_schema.sql` already permits authenticated station-authorized staff/admin inserts through `private.is_staff_for_station(station_id)`. The current hardening migration, `20260728130000_harden_tablet_sync_rls.sql`, additionally binds `registered_by_staff_id` to the active current staff member and requires an active device. Preserve that database authorization baseline; do not invent a new admin-only requirement or bypass it with service-role enrollment.

The missing work is the enrollment transport and lifecycle contract: HTTP method/path, payload/response, identifier collision behavior, re-enrollment, reassignment and lost/disabled-device recovery. Decide these explicitly before implementing registration. Existing guard behavior requires an already registered active device and is therefore not an initial-enrollment mechanism.

## Integration requirements and evidence

- Every implemented tablet HTTP method must await the access guard and return its error before privileged workflow work. Use only the validated context for station-scoped reads/writes. An active elevated-role staff member may use a device at a different station from their own assignment; missing assignments and selected-station/device mismatches remain denied.
- Define each future route's device/station transport and duplicate-source behavior. Bootstrap currently uses query parameters; this does not silently establish the transport contract for other routes.
- Non-null station IDs depend on schema foreign keys for referential integrity. The helper does not validate station operational lifecycle or invent station-status policy.
- `bootstrap/route.integration.test.ts` exercises the actual route → query adapter → access guard → fail-closed service, mocking only auth/Supabase dependencies. It covers missing/failed auth, non-staff/inactive staff, inactive/unregistered devices, missing station assignments, ordinary mismatch, elevated selected-station mismatch, query/config failures and authorized bounded 503. Denied/malformed requests assert no snapshot client construction or snapshot dataset reads; guard-owned staff/device lookups are distinguished from workflow reads. These are local runtime tests, not hosted DB or HTTP-server evidence.
- `bootstrap/route.test.ts` covers loader boundary/error handling and verifies cloned guard errors preserve original headers and unread body. Every response branch is checked for private/no-store behavior. Keep an authorization inventory gate as more HTTP handlers are introduced; this bootstrap coverage cannot prove future routes safe.

DEMO-08 and the staff-tablet live demo remain blocked on complete APIs and the enrollment HTTP/lifecycle contract. This document does not claim those product tickets are complete.
