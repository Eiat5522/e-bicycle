# Staff Tablet Implementation Spec

## Purpose

This document turns the staff tablet wireflow and low-fidelity wireframes into an implementation-facing contract for the standalone station tablet app.

The tablet app is an offline-first operational app for trained station staff at:

- Lamphun Tourism Center.
- Lamphun Railway Station.
- Storage/operations center.

The app must support rental start, return, inspection, payment reference capture, incident logging, bike checks, battery logging, and daily closeout when internet is unavailable. The backend remains the source of truth after sync.

## Product Scope

### App Boundary

Recommended workspace: `apps/staff-tablet`.

Recommended package name: `@glide/staff-tablet`.

Recommended runtime: Expo / React Native tablet app with local SQLite storage, local filesystem evidence storage, and Supabase-authenticated API sync.

The staff tablet is standalone from the customer mobile app because station staff must continue work without internet. It should still reuse shared domain types where possible.

### Existing Contracts To Preserve

The implementation should be additive and should not break current mobile or admin behavior.

Preserve these existing seams:

- Customer app bike status update contract: `PATCH /api/bikes/:bikeId/status` with Bearer token and body `{ "status": "..." }`.
- Admin/staff server auth pattern: authenticated Supabase Bearer token plus server-side role validation.
- Current bike read fields used by mobile: `id`, `model`, `image_url`, `ride_class`, `estimated_range_km`, `top_speed_kmh`, `pricing_label`, `rate_per_minute`, `status`, `active_rider_id`, `active_ride_started_at`, `active_ride_start_location`, `location`, `latitude`, `longitude`, `last_reported_at`, `created_at`, `updated_at`.
- `rental_transactions` as the operational rental ledger used by admin/reporting.
- `bike_status_events` as the status transition audit log.
- Existing rider app ride-completion behavior until an explicit migration replaces it.

## Screen-To-Contract Map

| Screen | Local Records | Server Targets | Blocking Rule |
| --- | --- | --- | --- |
| Login / unlock shift | `staff_session`, `local_records` auth event | `tablet_devices`, `staff_profiles`, `audit_logs` | No station operations without valid cached or online staff session |
| Station Today | `bike_cache`, `rider_cache`, local queue summaries | Bootstrap snapshot endpoint | Shows local truth first when offline |
| Start Rental | `rental_drafts`, `payment_references`, `bike_checks`, `evidence_files` | `rental_transactions`, `payments`, `attachments`, `bike_status_events` | No bike release without local Rental ID and passable pre-use check |
| Return Vehicle | `return_drafts`, `payment_references`, `incident_reports`, `evidence_files` | `rental_transactions`, `payments`, `incidents`, `maintenance_logs`, `bike_status_events` | Returned bike is locally blocked until inspection and sync resolution |
| Bike Check | `bike_checks`, `evidence_files` | `maintenance_logs`, `bike_status_events`, `audit_logs` | Failed critical check blocks rental |
| Payment | `payment_references`, `evidence_files` | `payments`, `attachments` | Unverified payment remains pending; do not mark verified offline |
| Incident | `incident_reports`, `evidence_files` | `incidents`, `attachments`, `maintenance_logs`, `bike_status_events` | Safety incident blocks bike until manager/maintenance resolution |
| Battery | `battery_logs`, `bike_checks` | `batteries`, battery logs, `bike_status_events` | Abnormal battery blocks bike or battery assignment |
| Offline Queue | `local_records`, `sync_outbox`, `sync_conflicts` | `/api/staff-tablet/sync` | Critical conflicts stay visible and cannot be dismissed by staff |
| Daily Closeout | `local_records` closeout record | `audit_logs`, shift/closeout table | Shift cannot close cleanly with unresolved critical records |

## Domain Enums

Use shared string enums so local records, API payloads, and server validation agree. `BikeStatus` is the canonical cross-application lifecycle status imported from the shared package; the tablet must not define a parallel status vocabulary.

```ts
export type TabletRecordType =
  | "staff_auth_event"
  | "rider_registration"
  | "rental_start"
  | "rental_return"
  | "payment_reference"
  | "incident"
  | "bike_check"
  | "battery_log"
  | "manual_override"
  | "shift_closeout"
  | "evidence_file";

export type TabletSyncState =
  | "draft"
  | "ready_to_sync"
  | "syncing"
  | "synced"
  | "needs_evidence_upload"
  | "conflict"
  | "exported_to_backup"
  | "rejected";

export type BikeStatus =
  | "ready_to_rent"
  | "reserved"
  | "in_use"
  | "returned_pending_inspection"
  | "charging"
  | "maintenance_required"
  | "out_of_service";

export type TabletPaymentMethod =
  | "promptpay"
  | "thai_qr"
  | "digital_wallet"
  | "credit_card"
  | "cash"
  | "manual_reference";

export type TabletPaymentVerificationState =
  | "pending"
  | "verified"
  | "rejected"
  | "disputed";

export type TabletEvidenceKind =
  | "pre_use_photo"
  | "return_photo"
  | "payment_slip"
  | "incident_photo"
  | "bike_check_photo"
  | "battery_photo"
  | "backup_form_photo";
```

## Local Storage

Use SQLite for operational data. Use the device filesystem for captured evidence files and store file metadata in SQLite. Use AsyncStorage only for small preferences and Supabase session material.

Local IDs must be UUIDs generated on the device. Business IDs such as Rental ID must be generated before release and must remain stable after sync.

### `device_state`

Stores singleton device and sync settings.

| Column | Type | Notes |
| --- | --- | --- |
| `key` | text primary key | Example: `device_id`, `last_successful_sync_at`, `station_id` |
| `value_json` | text not null | JSON encoded value |
| `updated_at_device` | text not null | ISO timestamp |

### `staff_session`

Stores current and recent staff sessions.

| Column | Type | Notes |
| --- | --- | --- |
| `local_id` | text primary key | Local session ID |
| `staff_id` | text not null | Server staff/profile ID when known |
| `staff_name` | text not null | Cached display name |
| `role` | text not null | Staff role used for local permissions |
| `station_id` | text not null | Current station |
| `auth_mode` | text not null | `online`, `cached_offline`, or `manager_override` |
| `started_at_device` | text not null | Shift/session start |
| `expires_at_device` | text not null | Offline access TTL |
| `sync_state` | text not null | `synced`, `ready_to_sync`, etc. |

### `local_records`

Canonical local record index used by all screens and the Offline Queue.

| Column | Type | Notes |
| --- | --- | --- |
| `local_id` | text primary key | Stable device UUID |
| `record_type` | text not null | `TabletRecordType` |
| `business_id` | text | Rental ID, Incident ID, Closeout ID, etc. |
| `station_id` | text not null | Station that created the record |
| `staff_id` | text not null | Staff actor |
| `device_id` | text not null | Registered tablet |
| `sync_state` | text not null | `TabletSyncState` |
| `critical` | integer not null | `1` if affects rental, payment, safety, or bike availability |
| `created_at_device` | text not null | ISO timestamp |
| `updated_at_device` | text not null | ISO timestamp |
| `server_id` | text | Filled after accepted sync |
| `payload_json` | text not null | Full screen payload |
| `conflict_reason` | text | Human-readable conflict reason |
| `sync_attempt_count` | integer not null default 0 | Retry counter |
| `last_sync_attempt_at` | text | ISO timestamp |
| `exported_at_device` | text | Backup workflow export timestamp |
| `rejected_at_server` | text | Server rejection timestamp |

### `rider_cache`

Local rider lookup cache and station-assisted rider drafts.

| Column | Type | Notes |
| --- | --- | --- |
| `local_id` | text primary key | Local rider ID |
| `server_id` | text | Server user/profile/customer ID when synced |
| `name` | text not null | Rider name |
| `phone` | text not null | Search key |
| `user_type` | text not null | `local`, `citizen`, `tourist`, or configured label |
| `email` | text | Optional |
| `identity_reference` | text | Optional, only if policy requires |
| `pdpa_notice_version` | text not null | Notice accepted at station |
| `pdpa_accepted_at_device` | text not null | ISO timestamp |
| `updated_at_device` | text not null | ISO timestamp |
| `sync_state` | text not null | Sync status |

### `bike_cache`

Local station bike snapshot.

| Column | Type | Notes |
| --- | --- | --- |
| `vehicle_id` | text primary key | Bike ID / QR code ID |
| `model` | text | FreeDare model label if available |
| `product_status` | text not null | `BikeStatus` |
| `server_status` | text | Last server-confirmed canonical `BikeStatus`; used for offline expected-state conflict detection |
| `station_id` | text | Last known station |
| `battery_status` | text | `normal`, `low`, `charging`, `abnormal`, etc. |
| `battery_level` | integer | Percent when available |
| `blocked_reason` | text | Maintenance, incident, pending inspection, etc. |
| `last_known_at_server` | text | Server snapshot timestamp |
| `last_known_at_device` | text not null | Device update timestamp |
| `payload_json` | text not null | Raw snapshot for forward compatibility |

### `rental_drafts`

Rental start records.

| Column | Type | Notes |
| --- | --- | --- |
| `local_id` | text primary key | Links to `local_records.local_id` |
| `rental_id` | text not null unique | Generated before bike release |
| `rider_local_id` | text not null | Local rider reference |
| `rider_server_id` | text | Filled when known |
| `vehicle_id` | text not null | Bike being released |
| `station_id` | text not null | Start station |
| `staff_id` | text not null | Staff actor |
| `started_at_device` | text not null | Start timestamp |
| `inspection_state` | text not null | `passed`, `failed`, `blocked`, `override` |
| `payment_state` | text not null | Payment verification state |
| `sync_state` | text not null | Sync status |
| `payload_json` | text not null | Full start payload |

### `return_drafts`

Rental return records.

| Column | Type | Notes |
| --- | --- | --- |
| `local_id` | text primary key | Links to `local_records.local_id` |
| `rental_id` | text not null | Matching or exception Rental ID |
| `vehicle_id` | text not null | Returned bike |
| `return_station_id` | text not null | Return station |
| `staff_id` | text not null | Staff actor |
| `returned_at_device` | text not null | Return timestamp |
| `inspection_outcome` | text not null | `pass`, `minor_issue`, `critical_fail`, `damage`, `exception` |
| `payment_state` | text not null | Payment verification state |
| `bike_outcome` | text not null | Next `BikeStatus` |
| `sync_state` | text not null | Sync status |
| `payload_json` | text not null | Full return payload |

### `payment_references`

Payment references captured by staff.

| Column | Type | Notes |
| --- | --- | --- |
| `local_id` | text primary key | Payment reference local ID |
| `rental_id` | text not null | Rental ID |
| `method` | text not null | `TabletPaymentMethod` |
| `amount` | integer not null | Minor unit satang |
| `currency_code` | text not null | `THB` |
| `reference` | text | Slip/reference/authorization text |
| `verification_state` | text not null | Default `pending` unless server confirms |
| `evidence_local_id` | text | Payment slip evidence |
| `sync_state` | text not null | Sync status |
| `payload_json` | text not null | Full payment payload |

### `incident_reports`

Incident and damage reports.

| Column | Type | Notes |
| --- | --- | --- |
| `local_id` | text primary key | Incident local ID |
| `incident_id` | text not null unique | Human-readable incident ID |
| `rental_id` | text | Optional |
| `vehicle_id` | text | Optional |
| `incident_type` | text not null | Damage, accident, lost item, complaint, safety, etc. |
| `severity` | text not null | `low`, `medium`, `high`, `critical` |
| `status` | text not null | `open`, `linked`, `resolved`, `rejected` |
| `staff_id` | text not null | Staff actor |
| `station_id` | text not null | Station |
| `sync_state` | text not null | Sync status |
| `payload_json` | text not null | Full incident payload |

### `bike_checks`

Pre-use, return, ad hoc, and daily bike checks.

| Column | Type | Notes |
| --- | --- | --- |
| `local_id` | text primary key | Bike check local ID |
| `vehicle_id` | text not null | Checked bike |
| `check_type` | text not null | `pre_use`, `return`, `daily`, `ad_hoc`, `maintenance_followup` |
| `outcome` | text not null | `pass`, `minor_issue`, `critical_fail`, `override` |
| `next_status` | text not null | Proposed `BikeStatus` |
| `staff_id` | text not null | Staff actor |
| `station_id` | text not null | Station |
| `sync_state` | text not null | Sync status |
| `payload_json` | text not null | Checklist answers |

### `battery_logs`

Battery charge and abnormal battery records.

| Column | Type | Notes |
| --- | --- | --- |
| `local_id` | text primary key | Battery log local ID |
| `battery_id` | text | Battery ID if tracked separately |
| `vehicle_id` | text | Bike ID if battery is fixed to bike |
| `station_id` | text not null | Station |
| `charge_level` | integer | Percent when available |
| `status` | text not null | `normal`, `low`, `charging`, `charged`, `abnormal`, `quarantined` |
| `abnormal` | integer not null | `1` if separated/quarantined |
| `sync_state` | text not null | Sync status |
| `payload_json` | text not null | Full battery payload |

### `evidence_files`

Local evidence metadata.

| Column | Type | Notes |
| --- | --- | --- |
| `local_id` | text primary key | Evidence local ID |
| `parent_local_id` | text not null | Record that owns the evidence |
| `kind` | text not null | `TabletEvidenceKind` |
| `local_uri` | text not null | Device filesystem URI |
| `mime_type` | text not null | Allowlisted MIME type |
| `sha256` | text not null | File integrity hash |
| `byte_size` | integer not null | Upload validation |
| `upload_state` | text not null | `local_only`, `uploading`, `uploaded`, `failed`, `linked` |
| `server_attachment_id` | text | Filled after upload complete |
| `created_at_device` | text not null | ISO timestamp |

### `sync_outbox`

Ordered local sync tasks.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer primary key autoincrement | Local sequence |
| `local_record_id` | text not null | Links to `local_records` |
| `sequence` | integer not null | Deterministic ordering |
| `endpoint` | text not null | Usually `/api/staff-tablet/sync` |
| `method` | text not null | `POST` |
| `body_json` | text not null | Sync envelope or upload request |
| `dependency_local_id` | text | Parent record that must sync first |
| `status` | text not null | `queued`, `syncing`, `accepted`, `failed`, `conflict`, `rejected` |
| `attempts` | integer not null default 0 | Retry count |
| `last_error` | text | Last failure text |
| `created_at_device` | text not null | ISO timestamp |

### `sync_conflicts`

Local conflict worklist.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer primary key autoincrement | Local conflict ID |
| `local_record_id` | text not null | Conflicted record |
| `conflict_type` | text not null | See conflict table below |
| `server_snapshot_json` | text | Server state that caused conflict |
| `local_snapshot_json` | text not null | Staff-recorded state |
| `resolution_state` | text not null | `open`, `staff_corrected`, `manager_required`, `resolved`, `rejected` |
| `assigned_to` | text | Staff/manager ID when assigned |
| `created_at_device` | text not null | ISO timestamp |

## API Contracts

All staff tablet endpoints require a Bearer token and server-side staff authorization. The server must validate that the user is an active staff member assigned to the selected station or has a manager/admin role that allows cross-station work.

Base path: `/api/staff-tablet`.

### `GET /api/staff-tablet/bootstrap`

Downloads the station snapshot needed to work offline.

Query parameters:

| Name | Required | Notes |
| --- | --- | --- |
| `stationId` | yes | Current station |
| `deviceId` | yes | Registered tablet ID |
| `since` | no | Optional server cursor |

Response:

```ts
export interface StationSnapshot {
  stationId: string;
  name: string;
  serviceMode: "open" | "limited" | "closed" | "backup";
  timezone: "Asia/Bangkok";
}

export interface StaffSnapshot {
  staffId: string;
  name: string;
  role: "station_staff" | "station_manager" | "admin";
  stationIds: string[];
  offlineAccessExpiresAt?: string;
}

export interface TabletDeviceSnapshot {
  deviceId: string;
  stationIds: string[];
  status: "active" | "disabled" | "lost";
  offlineAccessEnabled: boolean;
}

export interface BikeSnapshot {
  vehicleId: string;
  model?: string;
  productStatus: BikeStatus;
  serverStatus?: string;
  stationId?: string;
  batteryLevel?: number;
  batteryStatus?: string;
  blockedReason?: string;
  lastKnownAtServer: string;
}

export interface ActiveRentalSnapshot {
  rentalId: string;
  vehicleId: string;
  riderDisplayName: string;
  riderPhone?: string;
  startStationId: string;
  startedAtServer: string;
  paymentState: TabletPaymentVerificationState;
}

export interface PaymentSnapshot {
  paymentId: string;
  rentalId: string;
  amount: number;
  currencyCode: "THB";
  verificationState: TabletPaymentVerificationState;
}

export interface IncidentSnapshot {
  incidentId: string;
  rentalId?: string;
  vehicleId?: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "linked" | "resolved" | "rejected";
}

export interface StaffTabletBootstrapResponse {
  serverTime: string;
  station: StationSnapshot;
  staff: StaffSnapshot;
  device: TabletDeviceSnapshot;
  notice: {
    pdpaNoticeVersion: string;
    rentalNoticeVersion: string;
  };
  bikes: BikeSnapshot[];
  activeRentals: ActiveRentalSnapshot[];
  pendingPayments: PaymentSnapshot[];
  openIncidents: IncidentSnapshot[];
  sync: {
    serverRevision: string;
    nextRecommendedSyncAt: string;
  };
}
```

### `POST /api/staff-tablet/sync`

Uploads one idempotent batch of local records.

Request:

```ts
export interface TabletSyncEnvelope {
  clientBatchId: string;
  deviceId: string;
  stationId: string;
  staffId: string;
  createdAtDevice: string;
  lastKnownServerRevision?: string;
  appVersion: string;
  records: TabletSyncRecord[];
}

export interface TabletSyncRecord {
  localId: string;
  recordType: TabletRecordType;
  businessId?: string;
  occurredAtDevice: string;
  payload: TabletRecordPayload;
  evidence: TabletEvidenceReference[];
  dependencies: string[];
}

export interface TabletEvidenceReference {
  evidenceLocalId: string;
  kind: TabletEvidenceKind;
  required: boolean;
  sha256: string;
  byteSize: number;
  mimeType: string;
}

export type TabletRecordPayload =
  | RiderRegistrationPayload
  | RentalStartPayload
  | RentalReturnPayload
  | PaymentReferencePayload
  | IncidentPayload
  | BikeCheckPayload
  | BatteryLogPayload
  | ManualOverridePayload
  | ShiftCloseoutPayload;
```

Response:

```ts
export interface TabletSyncResponse {
  serverTime: string;
  serverRevision: string;
  accepted: AcceptedSyncRecord[];
  conflicts: SyncConflict[];
  rejected: RejectedSyncRecord[];
  evidenceUploadRequests: EvidenceUploadRequest[];
  stationSnapshot?: Partial<StaffTabletBootstrapResponse>;
}

export interface AcceptedSyncRecord {
  localId: string;
  recordType: TabletRecordType;
  businessId?: string;
  serverId: string;
  serverStatus: "accepted" | "accepted_pending_evidence";
}

export interface SyncConflict {
  localId: string;
  conflictType: TabletConflictType;
  message: string;
  serverSnapshot?: unknown;
  allowedActions: Array<"edit_local" | "attach_evidence" | "manager_review" | "discard_local">;
}

export interface RejectedSyncRecord {
  localId: string;
  code: string;
  message: string;
  retryable: boolean;
}

export interface EvidenceUploadRequest {
  evidenceLocalId: string;
  parentLocalId: string;
  reason: "required" | "hash_missing" | "upload_failed" | "not_linked";
}
```

Idempotency rules:

- `clientBatchId` is unique per device sync attempt.
- `localId` is unique per device record.
- Replaying the same accepted `localId` returns the previous server mapping.
- Replaying the same Rental ID with different payload creates a conflict, not a second rental.

### `POST /api/staff-tablet/evidence/init`

Creates an upload target for a local evidence file.

Request:

```ts
export interface EvidenceInitRequest {
  deviceId: string;
  stationId: string;
  parentLocalId: string;
  evidenceLocalId: string;
  kind: TabletEvidenceKind;
  mimeType: string;
  byteSize: number;
  sha256: string;
}
```

Response:

```ts
export interface EvidenceInitResponse {
  evidenceLocalId: string;
  uploadUrl: string;
  uploadMethod: "PUT" | "POST";
  headers: Record<string, string>;
  expiresAt: string;
}
```

### `POST /api/staff-tablet/evidence/complete`

Links uploaded evidence to the operational record.

Request:

```ts
export interface EvidenceCompleteRequest {
  evidenceLocalId: string;
  parentLocalId: string;
  sha256: string;
  uploadedAtDevice: string;
}
```

Response:

```ts
export interface EvidenceCompleteResponse {
  evidenceLocalId: string;
  serverAttachmentId: string;
  linked: boolean;
}
```

### `GET /api/staff-tablet/sync/status`

Fetches server changes and conflict updates after the last successful sync.

Query parameters:

| Name | Required | Notes |
| --- | --- | --- |
| `stationId` | yes | Station scope |
| `deviceId` | yes | Tablet ID |
| `since` | yes | Last server revision |

Response:

```ts
export interface StaffTabletSyncStatusResponse {
  serverTime: string;
  serverRevision: string;
  stationSnapshotDelta: Partial<StaffTabletBootstrapResponse>;
  conflicts: SyncConflict[];
  resolvedLocalIds: string[];
}
```

### `POST /api/staff-tablet/backup-export`

Marks local records as exported to the backup workflow when backend sync is unavailable for an extended period.

Request:

```ts
export interface BackupExportRequest {
  deviceId: string;
  stationId: string;
  staffId: string;
  exportedAtDevice: string;
  records: Array<{
    localId: string;
    recordType: TabletRecordType;
    businessId?: string;
    exportReference: string;
  }>;
}
```

Response:

```ts
export interface BackupExportResponse {
  acceptedLocalIds: string[];
  rejected: RejectedSyncRecord[];
}
```

### `GET /api/admin/tablet-sync/conflicts`

Returns manager/admin reconciliation work created by staff tablet sync.

Query parameters:

| Name | Required | Notes |
| --- | --- | --- |
| `stationId` | no | Filter by station |
| `status` | no | `open`, `manager_required`, `resolved`, or `rejected` |

Response:

```ts
export interface TabletSyncConflictListResponse {
  conflicts: Array<{
    conflictId: string;
    localId: string;
    deviceId: string;
    stationId: string;
    recordType: TabletRecordType;
    businessId?: string;
    conflictType: TabletConflictType;
    message: string;
    createdAtServer: string;
    serverSnapshot?: unknown;
    localSnapshot: unknown;
  }>;
}
```

### `PATCH /api/admin/tablet-sync/conflicts/:conflictId`

Resolves a tablet sync conflict after manager/admin review.

Request:

```ts
export interface TabletSyncConflictResolutionRequest {
  resolution: "accept_local" | "accept_server" | "edit_and_accept" | "reject_local";
  editedPayload?: TabletRecordPayload;
  note: string;
}
```

Response:

```ts
export interface TabletSyncConflictResolutionResponse {
  conflictId: string;
  resolutionState: "resolved" | "rejected";
  affectedServerIds: string[];
  serverRevision: string;
}
```

## Payload Contracts

### Rider Registration

```ts
export interface RiderRegistrationPayload {
  riderLocalId: string;
  name: string;
  phone: string;
  userType: "local" | "citizen" | "tourist" | "other";
  email?: string;
  identityReference?: string;
  pdpaConsent: {
    acceptedAtDevice: string;
    noticeVersion: string;
    method: "staff_tablet";
    staffId: string;
    stationId: string;
  };
}
```

### Rental Start

```ts
export interface RentalStartPayload {
  rentalId: string;
  riderLocalId: string;
  riderServerId?: string;
  vehicleId: string;
  stationId: string;
  staffId: string;
  startedAtDevice: string;
  preUseInspection: BikeInspectionPayload;
  paymentReference?: PaymentReferencePayload;
  pdpaNoticeVersion: string;
  rentalNoticeVersion: string;
  manualOverride?: ManualOverridePayload;
}
```

### Rental Return

```ts
export interface RentalReturnPayload {
  rentalId: string;
  vehicleId: string;
  returnStationId: string;
  staffId: string;
  returnedAtDevice: string;
  returnInspection: BikeInspectionPayload;
  distanceKm?: number;
  batteryLevel?: number;
  paymentState: TabletPaymentVerificationState;
  bikeOutcome: BikeStatus;
  incidentLocalId?: string;
  manualOverride?: ManualOverridePayload;
}
```

### Bike Inspection

```ts
export interface BikeInspectionPayload {
  checkType: "pre_use" | "return" | "daily" | "ad_hoc" | "maintenance_followup";
  checklist: {
    brakes: "pass" | "fail";
    tires: "pass" | "fail";
    lights: "pass" | "fail";
    frameHandlebarSeat: "pass" | "fail";
    battery: "pass" | "fail" | "not_checked";
    qrVehicleIdReadable: "pass" | "fail";
    visibleDamage: "none" | "minor" | "critical";
    accessoriesPresent?: "pass" | "fail" | "not_checked";
    riderDispute?: boolean;
  };
  outcome: "pass" | "minor_issue" | "critical_fail" | "override";
  nextStatus: BikeStatus;
  notes?: string;
  evidenceLocalIds: string[];
}
```

### Payment Reference

```ts
export interface PaymentReferencePayload {
  rentalId: string;
  method: TabletPaymentMethod;
  amount: number;
  currencyCode: "THB";
  reference?: string;
  verificationState: TabletPaymentVerificationState;
  evidenceLocalIds: string[];
}
```

### Incident

```ts
export interface IncidentPayload {
  incidentId: string;
  incidentType: "damage" | "accident" | "lost_item" | "complaint" | "safety" | "other";
  severity: "low" | "medium" | "high" | "critical";
  rentalId?: string;
  vehicleId?: string;
  riderLocalId?: string;
  riderServerId?: string;
  stationId: string;
  staffId: string;
  description: string;
  bikeBlockRequired: boolean;
  evidenceLocalIds: string[];
}
```

### Battery Log

```ts
export interface BatteryLogPayload {
  batteryId?: string;
  vehicleId?: string;
  stationId: string;
  staffId: string;
  chargeLevel?: number;
  status: "normal" | "low" | "charging" | "charged" | "abnormal" | "quarantined";
  abnormal: boolean;
  notes?: string;
  evidenceLocalIds: string[];
}
```

### Manual Override

```ts
export interface ManualOverridePayload {
  overrideType:
    | "vehicle_lookup_missing"
    | "rental_lookup_missing"
    | "payment_pending"
    | "inspection_exception"
    | "station_exception";
  reason: string;
  staffId: string;
  managerStaffId?: string;
  createdAtDevice: string;
}
```

### Shift Closeout

```ts
export interface ShiftCloseoutPayload {
  stationId: string;
  staffId: string;
  closedAtDevice: string;
  activeRentalCount: number;
  unsyncedCriticalCount: number;
  blockedBikeCount: number;
  pendingPaymentCount: number;
  notes?: string;
}
```

## Server Mapping

The sync endpoint should validate each accepted record into canonical server tables. If any referenced canonical table is not available yet, insert into server-side tablet staging tables first and replay into canonical tables after migration.

Recommended additive server-side sync tables:

| Table | Purpose |
| --- | --- |
| `tablet_devices` | Registered station tablets, device status, assigned stations |
| `tablet_sync_batches` | Idempotent sync batch headers |
| `tablet_sync_records` | Raw accepted/rejected/conflicted local records |
| `tablet_sync_conflicts` | Manager reconciliation queue |

Canonical mapping:

| Record Type | Canonical Server Writes |
| --- | --- |
| `rider_registration` | Customer/profile record if needed; otherwise station-assisted rider record; audit log |
| `rental_start` | `rental_transactions`; bike set to in-use/unavailable; `bike_status_events`; payment if included |
| `rental_return` | `rental_transactions` completion fields; `bike_status_events`; incident or maintenance record if inspection fails |
| `payment_reference` | `payments`; `attachments` when slip evidence exists |
| `incident` | `incidents`; `attachments`; optional `maintenance_logs`; bike blocked when required |
| `bike_check` | `maintenance_logs` or audit-only check; `bike_status_events` when status changes |
| `battery_log` | `batteries` or battery log table; bike/battery hold when abnormal |
| `manual_override` | `audit_logs`; linked context on affected record |
| `shift_closeout` | Shift/closeout table or `audit_logs` until a dedicated table exists |
| `evidence_file` | `attachments` linked to parent entity |

## Sync Ordering

The tablet should enqueue records in this order:

1. Staff auth/session events.
2. Rider registration.
3. Rental starts.
4. Rental returns.
5. Payment references.
6. Incidents that block a bike.
7. Bike checks and battery logs.
8. Evidence upload completion.
9. Shift closeout.

Evidence files may upload before or after the parent record, but the parent record must remain `needs_evidence_upload` until required evidence is linked.

## Conflict Rules

```ts
export type TabletConflictType =
  | "bike_already_in_use"
  | "bike_status_changed"
  | "duplicate_rental_id"
  | "return_without_active_start"
  | "payment_mismatch"
  | "missing_required_evidence"
  | "station_mismatch"
  | "staff_not_authorized"
  | "stale_station_snapshot"
  | "server_validation_failed";
```

| Conflict | Server Behavior | Tablet Behavior |
| --- | --- | --- |
| Bike already in use | Reject or hold rental start; return server snapshot | Show conflict, keep bike blocked locally, require manager |
| Bike status changed | Reject status overwrite unless transition is still valid | Refresh bike cache and show blocker |
| Duplicate Rental ID | Reject second payload with different values | Require manager reconciliation |
| Return without active start | Accept as exception or conflict by policy | Keep bike `returned_pending_inspection` locally |
| Payment mismatch | Accept rental but keep payment pending/disputed | Show payment conflict, allow reference correction |
| Missing required evidence | Accept parent as pending evidence when possible | Show `needs_evidence_upload` |
| Station mismatch | Reject unauthorized station operation | Lock station action and require manager |
| Staff not authorized | Reject record | End session or require online re-auth |
| Stale station snapshot | Reject risky status transition | Force bootstrap refresh before retry |

The server must not silently overwrite current bike status with a stale offline transition.

## Security And Privacy

- Require Bearer token for all staff tablet endpoints.
- Validate staff role and station assignment server-side.
- Register each tablet device and include `deviceId` on every sync request.
- Limit offline unlock to previously authenticated staff and a configured TTL.
- Audit all bike status changes, payment changes, manual overrides, incident records, and rejected sync records.
- Keep customer-facing PDPA capture minimal: name, phone, user type, required notice acceptance, optional identity reference only when policy requires it.
- Do not mark payments verified offline unless the app has an approved offline verification method.
- Restrict evidence upload MIME types and size.
- Store evidence hashes and verify upload completion.

## Offline Acceptance Criteria

1. A staff member can start a rental with no internet, generate a Rental ID, pass pre-use inspection, capture a pending payment reference, and release a bike.
2. The locally released bike becomes unavailable for another local rental immediately.
3. A staff member can return a bike offline, run inspection, and mark the bike ready, pending inspection, maintenance required, or out of service locally.
4. A failed return inspection creates or links an incident/maintenance record and blocks the bike locally.
5. Syncing an offline rental start creates or updates the canonical rental ledger, payment reference, and bike status audit event exactly once.
6. Retrying the same sync batch does not duplicate rentals, payments, incidents, or status events.
7. A duplicate Rental ID or stale bike state creates a visible Offline Queue conflict.
8. Missing required evidence keeps the record actionable as `needs_evidence_upload`.
9. Unauthorized staff or station mismatch is rejected by the server and shown clearly on the tablet.
10. Daily closeout shows unresolved critical records before staff ends the shift.

## Implementation Notes

- Prefer a single sync batch endpoint over one endpoint per screen so the Offline Queue can be deterministic and idempotent.
- Keep raw accepted payloads in server-side tablet sync tables for audit and replay.
- Keep local payloads forward-compatible with `payload_json` columns even when typed helper tables exist.
- Use server-generated timestamps for canonical reporting, but preserve device timestamps for audit and offline reconstruction.
- Treat shared `BikeStatus` as the canonical lifecycle state for tablet, mobile, web/admin, server validation, `bikes.status`, and `bike_status_events`; do not add a tablet-to-backend status mapping layer.
- Keep all sync copy staff-readable; conflict text is part of the operational UX, not only an engineering error.
