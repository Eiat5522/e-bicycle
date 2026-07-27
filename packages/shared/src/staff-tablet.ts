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
