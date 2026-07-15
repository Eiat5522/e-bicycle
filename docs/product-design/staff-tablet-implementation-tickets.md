# Staff Tablet Implementation Tickets

## Purpose

This backlog turns the staff tablet implementation spec into build-ready tickets for the standalone staff tablet app and backend API/sync work.

Source specs:

- [Standalone Staff Tablet Wireflow And Offline Sync Spec](standalone-staff-tablet-wireflow.md)
- [Staff Tablet Low-Fidelity Wireframes](staff-tablet-low-fidelity-wireframes.md)
- [Staff Tablet Implementation Spec](staff-tablet-implementation-spec.md)

## Delivery Shape

Recommended implementation sequence:

1. Shared contracts and backend sync foundation.
2. Staff tablet app shell and local storage foundation.
3. Bootstrap/download flow.
4. Offline rental start.
5. Offline return and bike hold.
6. Evidence upload.
7. Offline Queue and conflict handling.
8. Daily closeout and admin reconciliation.

The MVP should prioritize reliable station operation over broad feature coverage. Rental start, return, bike blocking, payment reference capture, and sync idempotency are the non-negotiable path.

## Epic A: Shared Contracts

### ST-CONTRACT-01: Add Shared Staff Tablet Domain Types

Owner: shared/frontend-backend.

Scope:

- Add shared TypeScript types for tablet record types, sync states, product bike status, payment methods, payment verification states, evidence kinds, and conflict types.
- Add payload interfaces for rider registration, rental start, rental return, bike inspection, payment reference, incident, battery log, manual override, and shift closeout.
- Keep names aligned with [Staff Tablet Implementation Spec](staff-tablet-implementation-spec.md).

Dependencies: none.

Acceptance criteria:

- Types are exported from a shared package usable by `apps/staff-tablet` and `apps/web`.
- No customer mobile app contract is changed.
- Type names and enum string values match the spec.

Validation:

- Run shared package typecheck.
- Add unit tests for status mapping helpers if included in this ticket.

### ST-CONTRACT-02: Add Bike Status Mapping Utility

Owner: backend/shared.

Scope:

- Implement one server-side utility that maps `TabletBikeProductStatus` to current backend `bikes.status` values.
- Preserve existing mobile bike status update behavior.
- Define allowed staff tablet transitions for rental start, return, inspection fail, charging, maintenance, and out-of-service.

Dependencies: ST-CONTRACT-01.

Acceptance criteria:

- Status transition rules are centralized.
- Stale or unsafe offline transitions can be rejected by the sync endpoint.
- Every accepted status transition can produce a `bike_status_events` row.

Validation:

- Unit tests cover all product statuses.
- Unit tests cover rejected stale transitions.

## Epic B: Backend Schema And Sync Foundation

### ST-API-01: Add Tablet Sync Server Tables

Owner: backend/database.

Scope:

- Add additive Supabase migration for:
  - `tablet_devices`
  - `tablet_sync_batches`
  - `tablet_sync_records`
  - `tablet_sync_conflicts`
- Include station/device/staff foreign keys where current schema supports them.
- Store raw request/response payloads for audit and replay.
- Add indexes for `device_id`, `station_id`, `local_id`, `client_batch_id`, `business_id`, and conflict status.

Dependencies: ST-CONTRACT-01.

Acceptance criteria:

- Migration is additive only.
- Existing `rental_transactions`, `bike_status_events`, `bike_ride_history`, and customer app flows are not renamed or dropped.
- Replaying a `local_id` or `client_batch_id` can be resolved idempotently.

Validation:

- Run database migration locally or against the configured test database.
- Run generated type refresh if this repo workflow requires it.

### ST-API-02: Register And Authorize Staff Tablet Devices

Owner: backend/API.

Scope:

- Add server-side device validation for staff tablet requests.
- Support device status: `active`, `disabled`, `lost`.
- Validate staff role and station assignment for every `/api/staff-tablet/*` request.
- Reuse the existing authenticated Supabase client pattern used by admin routes.

Dependencies: ST-API-01.

Acceptance criteria:

- Requests without Bearer auth are rejected.
- Authenticated non-staff users are rejected.
- Staff assigned to a different station are rejected unless manager/admin policy allows it.
- Disabled/lost devices cannot sync.

Validation:

- API tests cover unauthenticated, non-staff, station mismatch, disabled device, and valid staff cases.

### ST-API-03: Build Staff Tablet Bootstrap Endpoint

Owner: backend/API.

Endpoint: `GET /api/staff-tablet/bootstrap`.

Scope:

- Return station snapshot, staff snapshot, device snapshot, notice versions, bike snapshot, active rentals, pending payments, open incidents, and server revision.
- Shape response according to `StaffTabletBootstrapResponse`.
- Use current canonical sources such as `bikes`, `rental_transactions`, `payments`, `incidents`, and staff/station tables where available.

Dependencies: ST-API-02, ST-CONTRACT-02.

Acceptance criteria:

- Staff can download enough data to run Station Today offline.
- Bike snapshot includes product status, server status, station, battery summary when available, blocker reason, and last known server timestamp.
- Active rentals are scoped to the station and include payment state.

Validation:

- API tests assert response shape and station scoping.
- Manual test with one known station and one known staff user.

### ST-API-04: Build Idempotent Sync Batch Endpoint

Owner: backend/API.

Endpoint: `POST /api/staff-tablet/sync`.

Scope:

- Accept `TabletSyncEnvelope`.
- Validate device, staff, station, record ordering, and payload shape.
- Persist batch and raw records before canonical writes.
- Idempotently accept repeated `clientBatchId` and repeated `localId`.
- Return accepted, rejected, conflict, and evidence upload request results.

Dependencies: ST-API-01, ST-API-02, ST-CONTRACT-01.

Acceptance criteria:

- Replaying the same batch does not duplicate canonical rows.
- Replaying the same `localId` returns the previous server mapping.
- A duplicate Rental ID with different payload creates a conflict.
- A stale bike state creates a conflict rather than overwriting server state.

Validation:

- API tests cover replayed batch, replayed record, duplicate Rental ID, stale bike state, invalid staff, and invalid device.

### ST-API-05: Implement Rental Start Sync Processor

Owner: backend/API.

Scope:

- Convert `rental_start` records into canonical rental ledger writes.
- Create or link station-assisted rider data.
- Create pending payment reference when included.
- Transition bike to unavailable/in-use using centralized status mapping.
- Insert `bike_status_events` for the status transition.

Dependencies: ST-API-04, ST-CONTRACT-02.

Acceptance criteria:

- Accepted offline rental start creates exactly one canonical rental record.
- Bike becomes unavailable/in-use after accepted sync.
- Payment is pending unless server-side verification confirms otherwise.
- Bike status audit event is written.

Validation:

- API tests for happy path, missing rider, blocked bike, duplicate rental, pending payment, and repeated sync.

### ST-API-06: Implement Rental Return Sync Processor

Owner: backend/API.

Scope:

- Convert `rental_return` records into canonical rental completion writes.
- Update payment state if included.
- Set next bike status to ready, pending inspection, maintenance required, or out of service.
- Create incident/maintenance records when inspection fails.
- Insert `bike_status_events` for status changes.

Dependencies: ST-API-04, ST-CONTRACT-02.

Acceptance criteria:

- Accepted return closes the matching rental exactly once.
- Return without matching start becomes a conflict or accepted exception according to policy.
- Failed inspection blocks the bike and creates incident/maintenance context.
- Replayed return does not duplicate incidents or status events.

Validation:

- API tests for pass return, payment pending, failed inspection, return without active start, and repeated sync.

### ST-API-07: Implement Payment, Incident, Bike Check, And Battery Sync Processors

Owner: backend/API.

Scope:

- Process `payment_reference`, `incident`, `bike_check`, and `battery_log` records.
- Write to canonical `payments`, `incidents`, `maintenance_logs`, `batteries` or battery log table, `attachments`, and `audit_logs` where appropriate.
- Block bike/battery when a safety condition requires it.

Dependencies: ST-API-04, ST-CONTRACT-02.

Acceptance criteria:

- Payment references stay pending unless verified by the server.
- Incidents can block a bike.
- Critical bike check failure blocks the bike.
- Abnormal battery creates a hold/quarantine state.

Validation:

- API tests for each record type and its blocking behavior.

### ST-API-08: Build Evidence Upload Endpoints

Owner: backend/API.

Endpoints:

- `POST /api/staff-tablet/evidence/init`
- `POST /api/staff-tablet/evidence/complete`

Scope:

- Generate upload targets for allowlisted evidence files.
- Validate MIME type, byte size, hash, device, station, staff, and parent record.
- Link uploaded evidence to canonical `attachments`.
- Keep parent records in `needs_evidence_upload` until required evidence is linked.

Dependencies: ST-API-04.

Acceptance criteria:

- Evidence upload cannot attach to a record the staff member cannot access.
- Missing required evidence is visible in sync response.
- Completed upload returns a server attachment ID.

Validation:

- API tests for allowed file, blocked MIME, too-large file, hash mismatch, unauthorized parent, and successful completion.

### ST-API-09: Build Sync Status And Delta Endpoint

Owner: backend/API.

Endpoint: `GET /api/staff-tablet/sync/status`.

Scope:

- Return server revision, station snapshot deltas, current conflicts, and resolved local IDs since the last revision.
- Support tablet refresh after reconnect without forcing a full bootstrap.

Dependencies: ST-API-03, ST-API-04.

Acceptance criteria:

- Tablet can update local bike/rental/payment/conflict state after reconnect.
- Endpoint is station-scoped and device-authorized.

Validation:

- API tests for delta since revision and station isolation.

### ST-API-10: Build Admin Conflict Review Endpoints

Owner: backend/admin.

Endpoints:

- `GET /api/admin/tablet-sync/conflicts`
- `PATCH /api/admin/tablet-sync/conflicts/:conflictId`

Scope:

- List tablet sync conflicts by station and status.
- Resolve conflicts as accept local, accept server, edit and accept, or reject local.
- Write audit log for each resolution.
- Return affected server IDs and new server revision.

Dependencies: ST-API-04.

Acceptance criteria:

- Managers/admins can see unresolved staff tablet conflicts.
- Resolution updates conflict state and affected canonical records.
- Staff tablet can see resolved local IDs via sync status.

Validation:

- API tests for list filters, each resolution action, and unauthorized access.

### ST-API-11: Build Backup Export Marker Endpoint

Owner: backend/API.

Endpoint: `POST /api/staff-tablet/backup-export`.

Scope:

- Accept backup export references for local records that were manually entered into the fallback workflow.
- Mark records as exported without treating them as canonical sync success.
- Preserve audit trail for later reconciliation.

Dependencies: ST-API-02, ST-API-04.

Acceptance criteria:

- Exported records remain visible until canonical sync or manager resolution.
- Export reference is stored with device, staff, station, and timestamp.

Validation:

- API tests for valid export, unauthorized staff, unknown record, and repeated export.

## Epic C: Staff Tablet App Foundation

### ST-APP-01: Scaffold Standalone Staff Tablet App

Owner: tablet app.

Scope:

- Add `apps/staff-tablet` as an Expo / React Native workspace.
- Configure package name `@glide/staff-tablet`.
- Add tablet-first routing for Login, Station Today, Start Rental, Return Vehicle, Bike Check, Payment, Incident, Battery, Offline Queue, Daily Closeout, and Help/SOP.
- Reuse shared types from ST-CONTRACT-01.

Dependencies: ST-CONTRACT-01.

Acceptance criteria:

- App starts independently from customer mobile app.
- Tablet shell renders persistent station/staff/sync context areas.
- Navigation includes all MVP station operations.

Validation:

- Run app typecheck.
- Launch Expo locally and verify initial routes.

### ST-APP-02: Implement Local SQLite Schema And Repository Layer

Owner: tablet app.

Scope:

- Create SQLite tables from the implementation spec:
  - `device_state`
  - `staff_session`
  - `local_records`
  - `rider_cache`
  - `bike_cache`
  - `rental_drafts`
  - `return_drafts`
  - `payment_references`
  - `incident_reports`
  - `bike_checks`
  - `battery_logs`
  - `evidence_files`
  - `sync_outbox`
  - `sync_conflicts`
- Add repository functions for create, update, query by sync state, and transactionally enqueue sync work.

Dependencies: ST-APP-01.

Acceptance criteria:

- Local database initializes on first app open.
- Schema migration version is stored in `device_state`.
- Rental start and return records can be created transactionally with `local_records` and `sync_outbox`.

Validation:

- Unit tests for schema creation and core repository writes.

### ST-APP-03: Implement Staff Session And Offline Unlock

Owner: tablet app.

Scope:

- Build Login / Unlock Shift screen.
- Support online login and cached offline unlock for previously authenticated staff.
- Store staff session, station selection, role, and offline TTL.
- Block operations when session is expired, station is missing, or device is disabled by bootstrap.

Dependencies: ST-APP-02, ST-API-02, ST-API-03.

Acceptance criteria:

- Staff can start a shift online.
- Previously authenticated staff can unlock offline within TTL.
- Expired or unauthorized sessions cannot access station operations.

Validation:

- Component tests for session states.
- Manual test online and offline unlock.

### ST-APP-04: Implement Bootstrap Download And Local Cache Refresh

Owner: tablet app.

Scope:

- Call `GET /api/staff-tablet/bootstrap`.
- Store station, bike, active rental, payment, incident, staff, and device snapshots locally.
- Show last successful sync and server revision.
- Handle partial failure with readable recovery copy.

Dependencies: ST-APP-02, ST-API-03.

Acceptance criteria:

- Station Today can render from cached bootstrap data.
- App can continue with last known snapshot when offline.
- Device disabled/lost response locks station operations.

Validation:

- Unit tests for bootstrap normalization.
- Manual test online bootstrap and offline reopen.

### ST-APP-05: Build Tablet Shell And Station Today

Owner: tablet app.

Scope:

- Implement tablet landscape shell from low-fidelity wireframes.
- Show station, staff, shift time, online/offline state, unsynced count, and backup mode.
- Render Station Today cards: active rentals, returns due, ready bikes, blocked bikes, pending payments, open incidents.
- Link cards to the relevant workflow or filtered list.

Dependencies: ST-APP-04.

Acceptance criteria:

- Staff can see station state from local cache.
- Offline state is visible as text, not only an icon.
- Unsynced critical records are one tap away.

Validation:

- Component tests for online/offline and empty states.
- Tablet viewport visual check.

## Epic D: Staff Tablet MVP Workflows

### ST-APP-06: Build Start Rental Workflow

Owner: tablet app.

Scope:

- Implement steps: Rider, Vehicle, Inspection, Payment, Review.
- Support station-assisted rider creation without mobile app account creation.
- Generate local Rental ID before release.
- Run pre-use inspection and block failed critical checks.
- Capture pending payment reference and optional slip evidence.
- Write `rental_drafts`, `payment_references`, `bike_checks`, `evidence_files`, `local_records`, and `sync_outbox`.
- Locally mark selected bike unavailable immediately after rental creation.

Dependencies: ST-APP-02, ST-APP-05.

Acceptance criteria:

- Staff can complete rental start fully offline.
- Failed critical inspection blocks rental and routes to bike check/incident.
- Completed rental appears in Offline Queue as `ready_to_sync`.
- Bike cannot be rented again locally after local rental creation.

Validation:

- Unit tests for Rental ID generation, inspection blockers, and local bike lock.
- Component tests for each step.
- Manual offline rental start test.

### ST-APP-07: Build Return Vehicle Workflow

Owner: tablet app.

Scope:

- Implement steps: Find Rental, Return Details, Inspection, Payment, Finish.
- Search by Rental ID, Vehicle ID, rider phone, or scan.
- Support offline exception return when matching rental is not cached.
- Run return inspection.
- Set local bike outcome: ready to rent, returned pending inspection, maintenance required, or out of service.
- Create incident/maintenance context on failed inspection.
- Write `return_drafts`, `incident_reports`, `bike_checks`, `payment_references`, `local_records`, and `sync_outbox`.

Dependencies: ST-APP-06.

Acceptance criteria:

- Staff can return a cached active rental offline.
- Staff can record exception return offline when rental is not cached.
- Failed inspection blocks the bike locally.
- Return record appears in Offline Queue as `ready_to_sync` or `conflict` after server response.

Validation:

- Unit tests for bike outcome rules.
- Component tests for cached rental and exception return paths.
- Manual offline return test.

### ST-APP-08: Build Payment Reference Workflow

Owner: tablet app.

Scope:

- Capture payment method, amount, currency, reference, verification state, and evidence.
- Default staff-created payment records to `pending`.
- Link payment references to rental start or return records.
- Surface payment mismatches in Offline Queue.

Dependencies: ST-APP-06, ST-API-07, ST-API-08.

Acceptance criteria:

- Payment can be captured without internet.
- Payment slip evidence can remain local until upload.
- Staff cannot mark payment verified offline unless enabled by policy.

Validation:

- Unit tests for payment defaults and validation.
- Manual payment capture with and without evidence.

### ST-APP-09: Build Bike Check, Incident, And Battery Workflows

Owner: tablet app.

Scope:

- Build Bike Check screen with pass/fail checklist and next status.
- Build Incident screen with severity, description, linked rental/bike, and evidence.
- Build Battery screen with charge state, abnormal flag, and quarantine/block behavior.
- Locally block bike/battery when safety rules require it.

Dependencies: ST-APP-02, ST-APP-05, ST-API-07.

Acceptance criteria:

- Staff can create ad hoc safety records offline.
- Critical bike check failure blocks rental locally.
- Incident with `bikeBlockRequired` blocks rental locally.
- Abnormal battery creates a local hold.

Validation:

- Unit tests for blocking rules.
- Component tests for required fields and evidence prompts.

### ST-APP-10: Build Evidence Capture And Upload Queue

Owner: tablet app.

Scope:

- Capture photos/files for pre-use, return, payment slip, incident, bike check, battery, and backup form evidence.
- Store local URI, MIME type, byte size, and hash in `evidence_files`.
- Request upload target and complete upload when online.
- Mark parent record `needs_evidence_upload` until required evidence is linked.

Dependencies: ST-APP-02, ST-API-08.

Acceptance criteria:

- Evidence can be captured offline and linked to parent local records.
- Upload retry is visible in Offline Queue.
- Failed upload does not lose the parent operational record.

Validation:

- Unit tests for evidence metadata and parent linking.
- Manual offline capture then online upload.

## Epic E: Sync, Conflicts, And Closeout

### ST-APP-11: Implement Sync Engine

Owner: tablet app.

Scope:

- Build sync worker for `sync_outbox`.
- Batch records into `TabletSyncEnvelope`.
- Respect dependency ordering and idempotency.
- Handle accepted, accepted pending evidence, rejected, and conflict responses.
- Update local records and cache snapshots after sync.

Dependencies: ST-APP-02, ST-API-04, ST-API-05, ST-API-06.

Acceptance criteria:

- Sync retries do not duplicate local or server records.
- Accepted records move to `synced` or `needs_evidence_upload`.
- Conflicts create `sync_conflicts` rows and appear in Offline Queue.
- Rejected records remain auditable.

Validation:

- Unit tests for envelope creation, response handling, retry, and dependency ordering.
- Integration test against mocked API.

### ST-APP-12: Build Offline Queue

Owner: tablet app.

Scope:

- Implement Offline Queue layout from wireframes.
- Filter by All, Rentals, Returns, Payments, Incidents, Bike Checks, Battery, Evidence, Conflicts.
- Sort by operational risk.
- Show detail panel with payload summary, evidence status, retry history, and conflict reason.
- Allow retry, allowed edit, attach evidence, export to backup, and escalate.

Dependencies: ST-APP-11, ST-APP-10.

Acceptance criteria:

- Unsynced critical records are visible and prioritized.
- Staff can retry sync when online.
- Staff can attach missing evidence from queue detail.
- Conflict copy is staff-readable.

Validation:

- Component tests for filter tabs, sort order, and state labels.
- Manual test with seeded local records.

### ST-APP-13: Implement Sync Status Refresh

Owner: tablet app.

Scope:

- Call `GET /api/staff-tablet/sync/status` after reconnect and periodically while online.
- Apply station snapshot deltas and resolved local IDs.
- Refresh Offline Queue conflict state without full bootstrap.

Dependencies: ST-APP-11, ST-API-09.

Acceptance criteria:

- Tablet reflects manager-resolved conflicts.
- Station Today updates bike availability after sync status refresh.

Validation:

- Unit tests for delta application.
- Manual reconnect test.

### ST-APP-14: Build Daily Closeout

Owner: tablet app.

Scope:

- Show active rental count, unsynced critical count, blocked bike count, pending payment count, and notes.
- Create `shift_closeout` local record.
- Prevent clean closeout when unresolved critical records remain; allow manager-marked exception if policy allows.

Dependencies: ST-APP-12.

Acceptance criteria:

- Staff can close shift with clear unresolved-work summary.
- Closeout is queued for sync.
- Critical unresolved records remain visible after closeout.

Validation:

- Component tests for clean and blocked closeout.
- Manual closeout test with seeded unresolved records.

### ST-APP-15: Implement Backup Export Flow

Owner: tablet app.

Scope:

- Allow staff to mark selected local records as exported to the approved backup workflow.
- Capture export reference.
- Call `POST /api/staff-tablet/backup-export` when online.
- Keep exported records visible until canonical sync or manager resolution.

Dependencies: ST-APP-12, ST-API-11.

Acceptance criteria:

- Exported records show `exported_to_backup`.
- Export does not mark record as canonical `synced`.
- Export reference is available in detail panel.

Validation:

- Unit tests for export state.
- Manual backup export test.

## Epic F: Admin Reconciliation Surface

### ST-ADMIN-01: Add Admin Conflict Queue Page

Owner: web/admin.

Scope:

- Add admin page for tablet sync conflicts.
- List conflict type, station, staff/device, record type, business ID, created time, and status.
- Filter by station and status.
- Open detail view showing staff-recorded data and server snapshot.

Dependencies: ST-API-10.

Acceptance criteria:

- Admin/manager can identify conflicts affecting bike availability, payment, or rental status.
- Unauthorized users cannot access the page.

Validation:

- Web tests for list rendering and access control.

### ST-ADMIN-02: Add Admin Conflict Resolution Actions

Owner: web/admin.

Scope:

- Add actions: accept local, accept server, edit and accept, reject local.
- Require manager note.
- Call `PATCH /api/admin/tablet-sync/conflicts/:conflictId`.
- Show affected server IDs and status after resolution.

Dependencies: ST-ADMIN-01.

Acceptance criteria:

- Manager can resolve each supported conflict type.
- Resolution note is required.
- Resolved conflict disappears from open queue and is visible by resolved filter.

Validation:

- Web tests for each action path.
- API integration test with mocked conflict.

## MVP Release Gate

The MVP should not launch station-assisted tablet rentals until these tickets are complete:

- ST-CONTRACT-01
- ST-CONTRACT-02
- ST-API-01 through ST-API-06
- ST-API-08
- ST-APP-01 through ST-APP-07
- ST-APP-10 through ST-APP-12

Recommended beta gate before full operations:

- ST-API-09 through ST-API-11
- ST-APP-13 through ST-APP-15
- ST-ADMIN-01
- ST-ADMIN-02
ena
## Cross-Cutting Test Scrios

1. Offline rental start syncs once: start rental offline, reconnect, sync twice, verify one rental, one payment reference, one bike status event.
2. Offline return with failed inspection: return bike offline, mark critical failure, reconnect, verify rental completion, incident/maintenance context, and blocked bike status.
3. Duplicate Rental ID conflict: create two local records with same Rental ID and different payloads, sync, verify conflict.
4. Stale bike state conflict: bootstrap bike as ready, change server bike to in use elsewhere, sync offline rental start, verify conflict and no overwrite.
5. Evidence pending path: create rental with required evidence offline, sync parent before evidence upload, verify `needs_evidence_upload`, upload evidence, verify linked attachment.
6. Unauthorized station: staff assigned to Tourism Center attempts Railway Station sync, verify rejection.
7. Manager resolution: create conflict, resolve in admin, refresh tablet sync status, verify local conflict resolved.
8. Backup export: export a critical unsynced record, verify it remains visible and is not treated as canonical sync success.

