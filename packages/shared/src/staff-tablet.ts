import type { BikeStatus } from "./bike-status";

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

export type TabletPaymentMethod =
  | "promptpay"
  | "thai_qr"
  | "digital_wallet"
  | "credit_card"
  | "cash"
  | "manual_reference";

export type TabletPaymentVerificationState = "pending" | "verified" | "rejected" | "disputed";

export type TabletEvidenceKind =
  | "pre_use_photo"
  | "return_photo"
  | "payment_slip"
  | "incident_photo"
  | "bike_check_photo"
  | "battery_photo"
  | "backup_form_photo";

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

export interface RiderRegistrationPayload {
  readonly riderLocalId: string;
  readonly name: string;
  readonly phone: string;
  readonly userType: "local" | "citizen" | "tourist" | "other";
  readonly email?: string;
  readonly identityReference?: string;
  readonly pdpaConsent: {
    readonly acceptedAtDevice: string;
    readonly noticeVersion: string;
    readonly method: "staff_tablet";
    readonly staffId: string;
    readonly stationId: string;
  };
}

export interface RentalStartPayload {
  readonly rentalId: string;
  readonly riderLocalId: string;
  readonly riderServerId?: string;
  readonly vehicleId: string;
  readonly stationId: string;
  readonly staffId: string;
  readonly startedAtDevice: string;
  readonly preUseInspection: BikeInspectionPayload;
  readonly paymentReference?: PaymentReferencePayload;
  readonly pdpaNoticeVersion: string;
  readonly rentalNoticeVersion: string;
  readonly manualOverride?: ManualOverridePayload;
}

export interface RentalReturnPayload {
  readonly rentalId: string;
  readonly vehicleId: string;
  readonly returnStationId: string;
  readonly staffId: string;
  readonly returnedAtDevice: string;
  readonly returnInspection: BikeInspectionPayload;
  readonly distanceKm?: number;
  readonly batteryLevel?: number;
  readonly paymentState: TabletPaymentVerificationState;
  readonly bikeOutcome: BikeStatus;
  readonly incidentLocalId?: string;
  readonly manualOverride?: ManualOverridePayload;
}

export interface BikeInspectionPayload {
  readonly checkType: "pre_use" | "return" | "daily" | "ad_hoc" | "maintenance_followup";
  readonly checklist: {
    readonly brakes: "pass" | "fail";
    readonly tires: "pass" | "fail";
    readonly lights: "pass" | "fail";
    readonly frameHandlebarSeat: "pass" | "fail";
    readonly battery: "pass" | "fail" | "not_checked";
    readonly qrVehicleIdReadable: "pass" | "fail";
    readonly visibleDamage: "none" | "minor" | "critical";
    readonly accessoriesPresent?: "pass" | "fail" | "not_checked";
    readonly riderDispute?: boolean;
  };
  readonly outcome: "pass" | "minor_issue" | "critical_fail" | "override";
  readonly nextStatus: BikeStatus;
  readonly notes?: string;
  readonly evidenceLocalIds: readonly string[];
}

export interface PaymentReferencePayload {
  readonly rentalId: string;
  readonly method: TabletPaymentMethod;
  readonly amount: number;
  readonly currencyCode: "THB";
  readonly reference?: string;
  readonly verificationState: TabletPaymentVerificationState;
  readonly evidenceLocalIds: readonly string[];
}

export interface IncidentPayload {
  readonly incidentId: string;
  readonly incidentType: "damage" | "accident" | "lost_item" | "complaint" | "safety" | "other";
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly rentalId?: string;
  readonly vehicleId?: string;
  readonly riderLocalId?: string;
  readonly riderServerId?: string;
  readonly stationId: string;
  readonly staffId: string;
  readonly description: string;
  readonly bikeBlockRequired: boolean;
  readonly evidenceLocalIds: readonly string[];
}

export interface BatteryLogPayload {
  readonly batteryId?: string;
  readonly vehicleId?: string;
  readonly stationId: string;
  readonly staffId: string;
  readonly chargeLevel?: number;
  readonly status: "normal" | "low" | "charging" | "charged" | "abnormal" | "quarantined";
  readonly abnormal: boolean;
  readonly notes?: string;
  readonly evidenceLocalIds: readonly string[];
}

export interface ManualOverridePayload {
  readonly overrideType:
    | "vehicle_lookup_missing"
    | "rental_lookup_missing"
    | "payment_pending"
    | "inspection_exception"
    | "station_exception";
  readonly reason: string;
  readonly staffId: string;
  readonly managerStaffId?: string;
  readonly createdAtDevice: string;
}

export interface ShiftCloseoutPayload {
  readonly stationId: string;
  readonly staffId: string;
  readonly closedAtDevice: string;
  readonly activeRentalCount: number;
  readonly unsyncedCriticalCount: number;
  readonly blockedBikeCount: number;
  readonly pendingPaymentCount: number;
  readonly notes?: string;
}

export type TabletRecordPayload =
  | RiderRegistrationPayload
  | RentalStartPayload
  | RentalReturnPayload
  | PaymentReferencePayload
  | IncidentPayload
  | BikeInspectionPayload
  | BatteryLogPayload
  | ManualOverridePayload
  | ShiftCloseoutPayload;

/** Product vocabulary shares the canonical bike status contract. */
export type TabletBikeProductStatus = BikeStatus;

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
  productStatus: TabletBikeProductStatus;
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

export interface EvidenceInitResponse {
  evidenceLocalId: string;
  uploadUrl: string;
  uploadMethod: "PUT" | "POST";
  headers: Record<string, string>;
  expiresAt: string;
}

export interface EvidenceCompleteRequest {
  evidenceLocalId: string;
  parentLocalId: string;
  sha256: string;
  uploadedAtDevice: string;
}

export interface EvidenceCompleteResponse {
  evidenceLocalId: string;
  serverAttachmentId: string;
  linked: boolean;
}

export interface StaffTabletSyncStatusResponse {
  serverTime: string;
  serverRevision: string;
  stationSnapshotDelta: Partial<StaffTabletBootstrapResponse>;
  conflicts: SyncConflict[];
  resolvedLocalIds: string[];
}
