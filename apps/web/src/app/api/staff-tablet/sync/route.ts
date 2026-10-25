import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isJsonObject, parseRequiredJsonObjectBody } from "@/app/api/_utils/json-body";

export interface TabletEvidenceReference {
  evidenceLocalId: string;
  kind: TabletEvidenceKind;
  required: boolean;
  sha256: string;
  byteSize: number;
  mimeType: string;
}

export type TabletEvidenceKind =
  | "pre_use_photo"
  | "return_photo"
  | "payment_slip"
  | "incident_photo"
  | "bike_check_photo"
  | "battery_photo"
  | "backup_form_photo";

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

export interface TabletSyncRecord {
  localId: string;
  recordType: TabletRecordType;
  businessId?: string;
  occurredAtDevice: string;
  payload: TabletRecordPayload;
  evidence: TabletEvidenceReference[];
  dependencies: string[];
}

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

export type BikeCheckPayload = BikeInspectionPayload & {
  vehicleId: string;
};

export interface PaymentReferencePayload {
  rentalId: string;
  method: TabletPaymentMethod;
  amount: number;
  currencyCode: "THB";
  reference?: string;
  verificationState: TabletPaymentVerificationState;
  evidenceLocalIds: string[];
}

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

export interface ManualOverridePayload {
  overrideType: "bike_status" | "rental_release" | "payment_accept" | "evidence_bypass";
  reason: string;
  authorizedBy: string;
  authorizedAtDevice: string;
}

export interface ShiftCloseoutPayload {
  closeoutId: string;
  stationId: string;
  staffId: string;
  closedAtDevice: string;
  summary: {
    rentalsStarted: number;
    rentalsReturned: number;
    incidentsLogged: number;
    paymentsCollected: number;
    bikesChecked: number;
  };
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

export type BikeStatus =
  | "ready_to_rent"
  | "reserved"
  | "in_use"
  | "returned_pending_inspection"
  | "charging"
  | "maintenance_required"
  | "out_of_service";

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

export interface AcceptedSyncRecord {
  localId: string;
  recordType: TabletRecordType;
  businessId: string | undefined;
  serverId: string;
  serverStatus: "accepted" | "accepted_pending_evidence";
}

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

export interface TabletSyncResponse {
  serverTime: string;
  serverRevision: string;
  accepted: AcceptedSyncRecord[];
  conflicts: SyncConflict[];
  rejected: RejectedSyncRecord[];
  evidenceUploadRequests: EvidenceUploadRequest[];
  stationSnapshot?: unknown;
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function verifyAuthAndDevice(
  supabase: SupabaseClient,
  envelope: TabletSyncEnvelope
): Promise<{ authorized: boolean; profileId: string; error?: string }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { authorized: false, profileId: "", error: "unauthorized" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("staff_profiles")
    .select("profile_id, role, station_id, status")
    .eq("profile_id", user.id)
    .single();

  if (profileError || !profile) {
    return { authorized: false, profileId: "", error: "profile_not_found" };
  }

  if (profile.status !== "active") {
    return { authorized: false, profileId: profile.profile_id, error: "staff_inactive" };
  }

  if (profile.station_id !== envelope.stationId) {
    return { authorized: false, profileId: profile.profile_id, error: "station_mismatch" };
  }

  const { data: device, error: deviceError } = await (supabase as any)
    .from("tablet_devices")
    .select("id, station_id, is_active, staff_id")
    .eq("id", envelope.deviceId)
    .single();

  if (deviceError || !device) {
    return { authorized: false, profileId: profile.profile_id, error: "device_not_found" };
  }

  if (!device.is_active) {
    return { authorized: false, profileId: profile.profile_id, error: "device_inactive" };
  }

  if (device.station_id !== envelope.stationId) {
    return { authorized: false, profileId: profile.profile_id, error: "device_station_mismatch" };
  }

  if (device.staff_id !== profile.profile_id) {
    return { authorized: false, profileId: profile.profile_id, error: "device_staff_mismatch" };
  }

  const { data: station, error: stationError } = await supabase
    .from("stations")
    .select("id, operating_status")
    .eq("id", envelope.stationId)
    .single();

  if (stationError || !station) {
    return { authorized: false, profileId: profile.profile_id, error: "station_not_found" };
  }

  if (station.operating_status !== "active") {
    return { authorized: false, profileId: profile.profile_id, error: "station_inactive" };
  }

  return { authorized: true, profileId: profile.profile_id };
}

async function checkBatchIdempotency(
  supabase: SupabaseClient,
  clientBatchId: string,
  deviceId: string
): Promise<{ isDuplicate: boolean; previousResponse?: TabletSyncResponse }> {
  const { data: batch, error } = await (supabase as any)
    .from("tablet_sync_batches")
    .select("response_json")
    .eq("client_batch_id", clientBatchId)
    .eq("device_id", deviceId)
    .single();

  if (error || !batch) {
    return { isDuplicate: false };
  }

  return {
    isDuplicate: true,
    previousResponse: batch.response_json as TabletSyncResponse,
  };
}

async function recordBatchAttempt(
  supabase: SupabaseClient,
  clientBatchId: string,
  deviceId: string,
  stationId: string,
  staffId: string,
  response: TabletSyncResponse
): Promise<void> {
  await (supabase as any).from("tablet_sync_batches").upsert(
    {
      client_batch_id: clientBatchId,
      device_id: deviceId,
      station_id: stationId,
      staff_id: staffId,
      response_json: response,
      created_at: new Date().toISOString(),
    },
    { onConflict: "client_batch_id,device_id" }
  );
}

async function processRecords(
  supabase: SupabaseClient,
  envelope: TabletSyncEnvelope,
  profileId: string
): Promise<{
  accepted: AcceptedSyncRecord[];
  conflicts: SyncConflict[];
  rejected: RejectedSyncRecord[];
  evidenceUploadRequests: EvidenceUploadRequest[];
}> {
  const accepted: AcceptedSyncRecord[] = [];
  const conflicts: SyncConflict[] = [];
  const rejected: RejectedSyncRecord[] = [];
  const evidenceUploadRequests: EvidenceUploadRequest[] = [];

  const seenLocalIds = new Set<string>();
  const seenBusinessIds = new Map<string, string>();

  for (const record of envelope.records) {
    if (seenLocalIds.has(record.localId)) {
      rejected.push({
        localId: record.localId,
        code: "DUPLICATE_LOCAL_ID",
        message: `Duplicate localId in batch: ${record.localId}`,
        retryable: false,
      });
      continue;
    }
    seenLocalIds.add(record.localId);

    if (record.businessId && seenBusinessIds.has(record.businessId)) {
      const existingLocalId = seenBusinessIds.get(record.businessId)!;
      conflicts.push({
        localId: record.localId,
        conflictType: "duplicate_rental_id",
        message: `Business ID ${record.businessId} already used by localId ${existingLocalId} with different payload`,
        serverSnapshot: { existingLocalId },
        allowedActions: ["manager_review"],
      });
      continue;
    }
    if (record.businessId) {
      seenBusinessIds.set(record.businessId, record.localId);
    }

    const recordResult = await processSingleRecord(supabase, envelope, record, profileId);

    if (recordResult.accepted) {
      accepted.push(recordResult.accepted);
    }
    if (recordResult.conflict) {
      conflicts.push(recordResult.conflict);
    }
    if (recordResult.rejected) {
      rejected.push(recordResult.rejected);
    }
    if (recordResult.evidenceRequests) {
      evidenceUploadRequests.push(...recordResult.evidenceRequests);
    }
  }

  return { accepted, conflicts, rejected, evidenceUploadRequests };
}

async function processSingleRecord(
  supabase: SupabaseClient,
  envelope: TabletSyncEnvelope,
  record: TabletSyncRecord,
  profileId: string
): Promise<{
  accepted?: AcceptedSyncRecord;
  conflict?: SyncConflict;
  rejected?: RejectedSyncRecord;
  evidenceRequests?: EvidenceUploadRequest[];
}> {
  switch (record.recordType) {
    case "rental_start":
      return processRentalStart(supabase, envelope, record, profileId);
    case "rental_return":
      return processRentalReturn(supabase, envelope, record, profileId);
    case "rider_registration":
      return processRiderRegistration(supabase, envelope, record, profileId);
    case "payment_reference":
      return processPaymentReference(supabase, envelope, record, profileId);
    case "incident":
      return processIncident(supabase, envelope, record, profileId);
    case "bike_check":
      return processBikeCheck(supabase, envelope, record, profileId);
    case "battery_log":
      return processBatteryLog(supabase, envelope, record, profileId);
    case "manual_override":
      return processManualOverride(supabase, envelope, record, profileId);
    case "shift_closeout":
      return processShiftCloseout(supabase, envelope, record, profileId);
    default:
      return {
        rejected: {
          localId: record.localId,
          code: "UNSUPPORTED_RECORD_TYPE",
          message: `Record type ${record.recordType} is not supported`,
          retryable: false,
        },
      };
  }
}

async function processRentalStart(
  supabase: SupabaseClient,
  envelope: TabletSyncEnvelope,
  record: TabletSyncRecord,
  profileId: string
): Promise<{
  accepted?: AcceptedSyncRecord;
  conflict?: SyncConflict;
  rejected?: RejectedSyncRecord;
  evidenceRequests?: EvidenceUploadRequest[];
}> {
  const payload = record.payload as RentalStartPayload;

  const { data: existingRental, error: rentalError } = await (supabase as any)
    .from("rental_transactions")
    .select("id, status, bike_id")
    .eq("id", payload.rentalId)
    .single();

  if (!rentalError && existingRental) {
    if (existingRental.bike_id !== payload.vehicleId) {
      return {
        conflict: {
          localId: record.localId,
          conflictType: "bike_already_in_use",
          message: `Rental ID ${payload.rentalId} already exists for a different bike`,
          serverSnapshot: { existingRental },
          allowedActions: ["manager_review"],
        },
      };
    }

    return {
      accepted: {
        localId: record.localId,
        recordType: record.recordType,
        businessId: record.businessId,
        serverId: existingRental.id,
        serverStatus: "accepted",
      },
    };
  }

  const { data: bike, error: bikeError } = await supabase
    .from("bikes")
    .select("id, status, station_id")
    .eq("id", payload.vehicleId)
    .single();

  if (bikeError || !bike) {
    return {
      rejected: {
        localId: record.localId,
        code: "BIKE_NOT_FOUND",
        message: `Bike ${payload.vehicleId} not found`,
        retryable: false,
      },
    };
  }

  if (bike.status !== "ready_to_rent") {
    return {
      conflict: {
        localId: record.localId,
        conflictType: "bike_status_changed",
        message: `Bike ${payload.vehicleId} is not ready to rent (current: ${bike.status})`,
        serverSnapshot: { bike },
        allowedActions: ["edit_local", "manager_review"],
      },
    };
  }

  if (bike.station_id !== envelope.stationId) {
    return {
      conflict: {
        localId: record.localId,
        conflictType: "station_mismatch",
        message: `Bike ${payload.vehicleId} is at station ${bike.station_id}, not ${envelope.stationId}`,
        serverSnapshot: { bike },
        allowedActions: ["manager_review"],
      },
    };
  }

  const { data: rider, error: riderError } = await (supabase as any)
    .from("riders")
    .select("id")
    .eq("local_id", payload.riderLocalId)
    .eq("station_id", envelope.stationId)
    .single();

  let riderId: string;
  if (riderError || !rider) {
    return {
      rejected: {
        localId: record.localId,
        code: "RIDER_NOT_FOUND",
        message: `Rider with localId ${payload.riderLocalId} not found. Register rider first.`,
        retryable: false,
      },
    };
  } else {
    riderId = rider.id;
  }

  const { data: rental, error: rentalCreateError } = await (supabase as any)
    .from("rental_transactions")
    .insert({
      id: payload.rentalId,
      rider_id: riderId,
      bike_id: payload.vehicleId,
      start_station_id: envelope.stationId,
      start_staff_id: profileId,
      started_at: new Date(payload.startedAtDevice).toISOString(),
      pre_use_inspection: payload.preUseInspection,
      pdpa_notice_version: payload.pdpaNoticeVersion,
      rental_notice_version: payload.rentalNoticeVersion,
      payment_reference: payload.paymentReference,
      manual_override: payload.manualOverride,
      status: "active",
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (rentalCreateError || !rental) {
    return {
      rejected: {
        localId: record.localId,
        code: "RENTAL_CREATION_FAILED",
        message: "Failed to create rental transaction",
        retryable: true,
      },
    };
  }

  await supabase
    .from("bikes")
    .update({ status: "in_use", active_rider_id: riderId, updated_at: new Date().toISOString() })
    .eq("id", payload.vehicleId);

  await (supabase as any).from("bike_status_events").insert({
    bike_id: payload.vehicleId,
    previous_status: "ready_to_rent",
    new_status: "in_use",
    rental_id: payload.rentalId,
    station_id: envelope.stationId,
    staff_id: profileId,
    source: "tablet_sync",
    metadata: { localId: record.localId, clientBatchId: envelope.clientBatchId },
    created_at: new Date().toISOString(),
  });

  return {
    accepted: {
      localId: record.localId,
      recordType: record.recordType,
      businessId: record.businessId,
      serverId: rental.id,
      serverStatus: "accepted",
    },
    evidenceRequests: payload.preUseInspection.evidenceLocalIds.map((evidenceLocalId) => ({
      evidenceLocalId,
      parentLocalId: record.localId,
      reason: "required" as const,
    })),
  };
}

async function processRentalReturn(
  supabase: SupabaseClient,
  envelope: TabletSyncEnvelope,
  record: TabletSyncRecord,
  profileId: string
): Promise<{
  accepted?: AcceptedSyncRecord;
  conflict?: SyncConflict;
  rejected?: RejectedSyncRecord;
  evidenceRequests?: EvidenceUploadRequest[];
}> {
  const payload = record.payload as RentalReturnPayload;

  const { data: rental, error: rentalError } = await (supabase as any)
    .from("rental_transactions")
    .select("id, status, bike_id, rider_id, start_station_id")
    .eq("id", payload.rentalId)
    .single();

  if (rentalError || !rental) {
    return {
      conflict: {
        localId: record.localId,
        conflictType: "return_without_active_start",
        message: `No active rental found for ID ${payload.rentalId}`,
        serverSnapshot: null,
        allowedActions: ["manager_review", "discard_local"],
      },
    };
  }

  if (rental.status !== "active") {
    return {
      conflict: {
        localId: record.localId,
        conflictType: "bike_status_changed",
        message: `Rental ${payload.rentalId} is not active (current: ${rental.status})`,
        serverSnapshot: { rental },
        allowedActions: ["manager_review"],
      },
    };
  }

  const { data: bike, error: bikeError } = await supabase
    .from("bikes")
    .select("id, status, station_id")
    .eq("id", payload.vehicleId)
    .single();

  if (bikeError || !bike) {
    return {
      rejected: {
        localId: record.localId,
        code: "BIKE_NOT_FOUND",
        message: `Bike ${payload.vehicleId} not found`,
        retryable: false,
      },
    };
  }

  if (bike.id !== rental.bike_id) {
    return {
      conflict: {
        localId: record.localId,
        conflictType: "bike_status_changed",
        message: `Return bike ${payload.vehicleId} does not match rental bike ${rental.bike_id}`,
        serverSnapshot: { bike, rental },
        allowedActions: ["manager_review"],
      },
    };
  }

  const { data: returnStation, error: stationError } = await supabase
    .from("stations")
    .select("id")
    .eq("id", payload.returnStationId)
    .single();

  if (stationError || !returnStation) {
    return {
      rejected: {
        localId: record.localId,
        code: "STATION_NOT_FOUND",
        message: `Return station ${payload.returnStationId} not found`,
        retryable: false,
      },
    };
  }

  const { error: updateError } = await (supabase as any)
    .from("rental_transactions")
    .update({
      end_station_id: payload.returnStationId,
      end_staff_id: profileId,
      ended_at: new Date(payload.returnedAtDevice).toISOString(),
      return_inspection: payload.returnInspection,
      distance_km: payload.distanceKm,
      battery_level: payload.batteryLevel,
      payment_state: payload.paymentState,
      bike_outcome: payload.bikeOutcome,
      incident_local_id: payload.incidentLocalId,
      manual_override: payload.manualOverride,
      status: "completed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.rentalId);

  if (updateError) {
    return {
      rejected: {
        localId: record.localId,
        code: "RENTAL_UPDATE_FAILED",
        message: "Failed to update rental transaction",
        retryable: true,
      },
    };
  }

  await supabase
    .from("bikes")
    .update({
      status: payload.bikeOutcome,
      station_id: payload.returnStationId,
      active_rider_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.vehicleId);

  await (supabase as any).from("bike_status_events").insert({
    bike_id: payload.vehicleId,
    previous_status: "in_use",
    new_status: payload.bikeOutcome,
    rental_id: payload.rentalId,
    station_id: payload.returnStationId,
    staff_id: profileId,
    source: "tablet_sync",
    metadata: { localId: record.localId, clientBatchId: envelope.clientBatchId },
    created_at: new Date().toISOString(),
  });

  return {
    accepted: {
      localId: record.localId,
      recordType: record.recordType,
      businessId: record.businessId,
      serverId: rental.id,
      serverStatus: "accepted",
    },
    evidenceRequests: payload.returnInspection.evidenceLocalIds.map((evidenceLocalId) => ({
      evidenceLocalId,
      parentLocalId: record.localId,
      reason: "required" as const,
    })),
  };
}

async function processRiderRegistration(
  supabase: SupabaseClient,
  envelope: TabletSyncEnvelope,
  record: TabletSyncRecord,
  profileId: string
): Promise<{
  accepted?: AcceptedSyncRecord;
  conflict?: SyncConflict;
  rejected?: RejectedSyncRecord;
  evidenceRequests?: EvidenceUploadRequest[];
}> {
  const payload = record.payload as RiderRegistrationPayload;

  const { data: existingRider, error } = await (supabase as any)
    .from("riders")
    .select("id")
    .eq("local_id", payload.riderLocalId)
    .eq("station_id", envelope.stationId)
    .single();

  if (!error && existingRider) {
    return {
      accepted: {
        localId: record.localId,
        recordType: record.recordType,
        businessId: record.businessId,
        serverId: existingRider.id,
        serverStatus: "accepted",
      },
    };
  }

  const { data: newRider, error: createError } = await (supabase as any)
    .from("riders")
    .insert({
      local_id: payload.riderLocalId,
      station_id: envelope.stationId,
      name: payload.name,
      phone: payload.phone,
      user_type: payload.userType,
      email: payload.email,
      identity_reference: payload.identityReference,
      pdpa_consent: payload.pdpaConsent,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (createError || !newRider) {
    return {
      rejected: {
        localId: record.localId,
        code: "RIDER_CREATION_FAILED",
        message: "Failed to create rider record",
        retryable: true,
      },
    };
  }

  return {
    accepted: {
      localId: record.localId,
      recordType: record.recordType,
      businessId: record.businessId,
      serverId: newRider.id,
      serverStatus: "accepted",
    },
  };
}

async function processPaymentReference(
  supabase: SupabaseClient,
  envelope: TabletSyncEnvelope,
  record: TabletSyncRecord,
  profileId: string
): Promise<{
  accepted?: AcceptedSyncRecord;
  conflict?: SyncConflict;
  rejected?: RejectedSyncRecord;
  evidenceRequests?: EvidenceUploadRequest[];
}> {
  const payload = record.payload as PaymentReferencePayload;

  const { data: rental, error: rentalError } = await (supabase as any)
    .from("rental_transactions")
    .select("id, payment_reference")
    .eq("id", payload.rentalId)
    .single();

  if (rentalError || !rental) {
    return {
      rejected: {
        localId: record.localId,
        code: "RENTAL_NOT_FOUND",
        message: `Rental ${payload.rentalId} not found`,
        retryable: false,
      },
    };
  }

  if (rental.payment_reference && (rental.payment_reference as any).verificationState === "verified") {
    return {
      conflict: {
        localId: record.localId,
        conflictType: "payment_mismatch",
        message: `Payment for rental ${payload.rentalId} is already verified`,
        serverSnapshot: { rental },
        allowedActions: ["manager_review"],
      },
    };
  }

  const { error: updateError } = await (supabase as any)
    .from("rental_transactions")
    .update({
      payment_reference: payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.rentalId);

  if (updateError) {
    return {
      rejected: {
        localId: record.localId,
        code: "PAYMENT_UPDATE_FAILED",
        message: "Failed to update payment reference",
        retryable: true,
      },
    };
  }

  return {
    accepted: {
      localId: record.localId,
      recordType: record.recordType,
      businessId: record.businessId,
      serverId: payload.rentalId,
      serverStatus: "accepted",
    },
    evidenceRequests: payload.evidenceLocalIds.map((evidenceLocalId) => ({
      evidenceLocalId,
      parentLocalId: record.localId,
      reason: "required" as const,
    })),
  };
}

async function processIncident(
  supabase: SupabaseClient,
  envelope: TabletSyncEnvelope,
  record: TabletSyncRecord,
  profileId: string
): Promise<{
  accepted?: AcceptedSyncRecord;
  conflict?: SyncConflict;
  rejected?: RejectedSyncRecord;
  evidenceRequests?: EvidenceUploadRequest[];
}> {
  const payload = record.payload as IncidentPayload;

  const { data: incident, error } = await (supabase as any)
    .from("incidents")
    .insert({
      id: payload.incidentId,
      incident_type: payload.incidentType,
      severity: payload.severity,
      rental_id: payload.rentalId,
      vehicle_id: payload.vehicleId,
      rider_local_id: payload.riderLocalId,
      rider_server_id: payload.riderServerId,
      station_id: envelope.stationId,
      staff_id: profileId,
      description: payload.description,
      bike_block_required: payload.bikeBlockRequired,
      evidence_local_ids: payload.evidenceLocalIds,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !incident) {
    return {
      rejected: {
        localId: record.localId,
        code: "INCIDENT_CREATION_FAILED",
        message: "Failed to create incident record",
        retryable: true,
      },
    };
  }

  if (payload.bikeBlockRequired && payload.vehicleId) {
    await supabase
      .from("bikes")
      .update({ status: "maintenance_required", updated_at: new Date().toISOString() })
      .eq("id", payload.vehicleId);
  }

  return {
    accepted: {
      localId: record.localId,
      recordType: record.recordType,
      businessId: record.businessId,
      serverId: incident.id,
      serverStatus: "accepted",
    },
    evidenceRequests: payload.evidenceLocalIds.map((evidenceLocalId) => ({
      evidenceLocalId,
      parentLocalId: record.localId,
      reason: "required" as const,
    })),
  };
}

async function processBikeCheck(
  supabase: SupabaseClient,
  envelope: TabletSyncEnvelope,
  record: TabletSyncRecord,
  profileId: string
): Promise<{
  accepted?: AcceptedSyncRecord;
  conflict?: SyncConflict;
  rejected?: RejectedSyncRecord;
  evidenceRequests?: EvidenceUploadRequest[];
}> {
  const payload = record.payload as BikeCheckPayload;

  if (!payload.vehicleId) {
    return {
      rejected: {
        localId: record.localId,
        code: "MISSING_VEHICLE_ID",
        message: "Bike check requires vehicleId in payload",
        retryable: false,
      },
    };
  }

  const { data: bike, error: bikeError } = await supabase
    .from("bikes")
    .select("id, status")
    .eq("id", payload.vehicleId)
    .single();

  if (bikeError || !bike) {
    return {
      rejected: {
        localId: record.localId,
        code: "BIKE_NOT_FOUND",
        message: `Bike ${payload.vehicleId} not found`,
        retryable: false,
      },
    };
  }

  const { data: check, error } = await (supabase as any)
    .from("bike_inspections")
    .insert({
      bike_id: payload.vehicleId,
      station_id: envelope.stationId,
      staff_id: profileId,
      check_type: payload.checkType,
      checklist: payload.checklist,
      outcome: payload.outcome,
      next_status: payload.nextStatus,
      notes: payload.notes,
      evidence_local_ids: payload.evidenceLocalIds,
      performed_at: new Date(record.occurredAtDevice).toISOString(),
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !check) {
    return {
      rejected: {
        localId: record.localId,
        code: "INSPECTION_CREATION_FAILED",
        message: "Failed to create bike inspection record",
        retryable: true,
      },
    };
  }

  if (payload.nextStatus !== bike.status) {
    await supabase
      .from("bikes")
      .update({ status: payload.nextStatus, updated_at: new Date().toISOString() })
      .eq("id", payload.vehicleId);

    await (supabase as any).from("bike_status_events").insert({
      bike_id: payload.vehicleId,
      previous_status: bike.status,
      new_status: payload.nextStatus,
      station_id: envelope.stationId,
      staff_id: profileId,
      source: "tablet_sync",
      metadata: { localId: record.localId, clientBatchId: envelope.clientBatchId },
      created_at: new Date().toISOString(),
    });
  }

  return {
    accepted: {
      localId: record.localId,
      recordType: record.recordType,
      businessId: record.businessId,
      serverId: check.id,
      serverStatus: "accepted",
    },
    evidenceRequests: payload.evidenceLocalIds.map((evidenceLocalId) => ({
      evidenceLocalId,
      parentLocalId: record.localId,
      reason: "required" as const,
    })),
  };
}

async function processBatteryLog(
  supabase: SupabaseClient,
  envelope: TabletSyncEnvelope,
  record: TabletSyncRecord,
  profileId: string
): Promise<{
  accepted?: AcceptedSyncRecord;
  conflict?: SyncConflict;
  rejected?: RejectedSyncRecord;
  evidenceRequests?: EvidenceUploadRequest[];
}> {
  const payload = record.payload as BatteryLogPayload;

  const { data: log, error } = await (supabase as any)
    .from("battery_logs")
    .insert({
      battery_id: payload.batteryId,
      vehicle_id: payload.vehicleId,
      station_id: envelope.stationId,
      staff_id: profileId,
      charge_level: payload.chargeLevel,
      status: payload.status,
      abnormal: payload.abnormal,
      notes: payload.notes,
      evidence_local_ids: payload.evidenceLocalIds,
      logged_at: new Date(record.occurredAtDevice).toISOString(),
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !log) {
    return {
      rejected: {
        localId: record.localId,
        code: "BATTERY_LOG_FAILED",
        message: "Failed to create battery log",
        retryable: true,
      },
    };
  }

  return {
    accepted: {
      localId: record.localId,
      recordType: record.recordType,
      businessId: record.businessId,
      serverId: log.id,
      serverStatus: "accepted",
    },
    evidenceRequests: payload.evidenceLocalIds.map((evidenceLocalId) => ({
      evidenceLocalId,
      parentLocalId: record.localId,
      reason: "required" as const,
    })),
  };
}

async function processManualOverride(
  supabase: SupabaseClient,
  envelope: TabletSyncEnvelope,
  record: TabletSyncRecord,
  profileId: string
): Promise<{
  accepted?: AcceptedSyncRecord;
  conflict?: SyncConflict;
  rejected?: RejectedSyncRecord;
  evidenceRequests?: EvidenceUploadRequest[];
}> {
  const payload = record.payload as ManualOverridePayload;

  const { data: override, error } = await (supabase as any)
    .from("manual_overrides")
    .insert({
      override_type: payload.overrideType,
      reason: payload.reason,
      authorized_by: payload.authorizedBy,
      authorized_at: new Date(payload.authorizedAtDevice).toISOString(),
      station_id: envelope.stationId,
      staff_id: profileId,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !override) {
    return {
      rejected: {
        localId: record.localId,
        code: "OVERRIDE_CREATION_FAILED",
        message: "Failed to create manual override record",
        retryable: true,
      },
    };
  }

  return {
    accepted: {
      localId: record.localId,
      recordType: record.recordType,
      businessId: record.businessId,
      serverId: override.id,
      serverStatus: "accepted",
    },
  };
}

async function processShiftCloseout(
  supabase: SupabaseClient,
  envelope: TabletSyncEnvelope,
  record: TabletSyncRecord,
  profileId: string
): Promise<{
  accepted?: AcceptedSyncRecord;
  conflict?: SyncConflict;
  rejected?: RejectedSyncRecord;
  evidenceRequests?: EvidenceUploadRequest[];
}> {
  const payload = record.payload as ShiftCloseoutPayload;

  const { data: closeout, error } = await (supabase as any)
    .from("shift_closeouts")
    .insert({
      id: payload.closeoutId,
      station_id: envelope.stationId,
      staff_id: profileId,
      closed_at: new Date(payload.closedAtDevice).toISOString(),
      summary: payload.summary,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !closeout) {
    return {
      rejected: {
        localId: record.localId,
        code: "CLOSEOUT_CREATION_FAILED",
        message: "Failed to create shift closeout record",
        retryable: true,
      },
    };
  }

  return {
    accepted: {
      localId: record.localId,
      recordType: record.recordType,
      businessId: record.businessId,
      serverId: closeout.id,
      serverStatus: "accepted",
    },
  };
}

export async function POST(request: NextRequest) {
  const parseResult = await parseRequiredJsonObjectBody(request);
  if (parseResult.error) {
    return parseResult.error;
  }

  const body = parseResult.body as unknown;

  if (!isJsonObject(body)) {
    return NextResponse.json({ message: "Request body must be a JSON object" }, { status: 400 });
  }

  const envelope = body as unknown as TabletSyncEnvelope;

  if (
    !envelope.clientBatchId ||
    !envelope.deviceId ||
    !envelope.stationId ||
    !envelope.staffId ||
    !envelope.createdAtDevice ||
    !envelope.appVersion ||
    !Array.isArray(envelope.records)
  ) {
    return NextResponse.json(
      { message: "Invalid envelope: missing required fields" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const authResult = await verifyAuthAndDevice(supabase, envelope);
  if (!authResult.authorized) {
    return NextResponse.json(
      { message: authResult.error || "Unauthorized" },
      { status: 401 }
    );
  }

  const idempotencyCheck = await checkBatchIdempotency(supabase, envelope.clientBatchId, envelope.deviceId);
  if (idempotencyCheck.isDuplicate && idempotencyCheck.previousResponse) {
    return NextResponse.json(idempotencyCheck.previousResponse, { status: 200 });
  }

  const result = await processRecords(supabase, envelope, authResult.profileId);

  const serverTime = new Date().toISOString();
  const serverRevision = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

  const response: TabletSyncResponse = {
    serverTime,
    serverRevision,
    accepted: result.accepted,
    conflicts: result.conflicts,
    rejected: result.rejected,
    evidenceUploadRequests: result.evidenceUploadRequests,
  };

  await recordBatchAttempt(supabase, envelope.clientBatchId, envelope.deviceId, envelope.stationId, envelope.staffId, response);

  const statusCode = result.rejected.length > 0 || result.conflicts.length > 0 ? 207 : 200;
  return NextResponse.json(response, { status: statusCode });
}