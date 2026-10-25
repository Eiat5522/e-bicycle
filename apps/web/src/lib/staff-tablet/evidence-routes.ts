import type { Database } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { EvidenceConfig, EvidenceInitRequest, EvidenceCompleteRequest, EvidenceCompleteResponse, ReserveResult, CompleteResult, VerifyResult } from "@/app/api/staff-tablet/evidence/_lib/types";
import { EVIDENCE_CONFIG, validateKind, validateMimeType, validateByteSize, validateSha256, validateUploadedAt, generateUploadKey } from "@/app/api/staff-tablet/evidence/_lib/config";
import { verifyAuthAndDevice, verifyParentRecord } from "@/app/api/staff-tablet/evidence/_lib/auth";
import { reserveEvidenceRecord } from "@/app/api/staff-tablet/evidence/_lib/reserve";
import { verifyEvidenceReservation, verifyStorageCompletion, verifyImageIntegrity } from "@/app/api/staff-tablet/evidence/_lib/verify";
import { completeEvidence } from "@/app/api/staff-tablet/evidence/_lib/complete";

type SupabaseClientTyped = SupabaseClient<Database>;

export interface InitResult {
  success: boolean;
  evidenceLocalId?: string;
  uploadUrl?: string;
  uploadMethod?: "PUT" | "POST";
  headers?: Record<string, string>;
  expiresAt?: string;
  error?: string;
  status: number;
}

export interface CompleteResultLocal {
  success: boolean;
  evidenceLocalId?: string;
  serverAttachmentId?: string | null;
  linked?: boolean;
  error?: string;
  code?: string;
  status: number;
}

/**
 * Thin adapter for evidence init - local byte-check only, fail-closed.
 * Delegates to existing lib functions but enforces LOCAL_BYTE_CHECK_ONLY policy.
 */
export async function initEvidenceLocalByteCheckOnly(
  supabase: SupabaseClientTyped,
  payload: EvidenceInitRequest
): Promise<InitResult> {
  // Validate required fields
  if (
    !payload.deviceId ||
    !payload.stationId ||
    !payload.parentLocalId ||
    !payload.evidenceLocalId ||
    !payload.kind ||
    !payload.mimeType ||
    typeof payload.byteSize !== "number" ||
    !payload.sha256
  ) {
    return { success: false, error: "Missing required fields", status: 400 };
  }

  // Validate evidence kind
  if (!validateKind(payload.kind)) {
    return { success: false, error: "Invalid evidence kind", status: 400 };
  }

  // Validate MIME type
  if (!validateMimeType(payload.mimeType, EVIDENCE_CONFIG)) {
    return { success: false, error: "MIME type not allowed", status: 400 };
  }

  // Validate byte size
  if (!validateByteSize(payload.byteSize, EVIDENCE_CONFIG)) {
    return { success: false, error: "File size out of allowed range", status: 400 };
  }

  // Validate SHA256
  if (!validateSha256(payload.sha256)) {
    return { success: false, error: "Invalid SHA256 hash format", status: 400 };
  }

  // Verify auth and device via request-context -> staff tablet access guard
  const authResult = await verifyAuthAndDevice(
    supabase,
    payload.deviceId,
    payload.stationId,
    payload.staffId
  );

  if (!authResult.authorized) {
    return { success: false, error: authResult.error || "Unauthorized", status: 401 };
  }

  // Verify parent record
  const parentCheck = await verifyParentRecord(
    supabase,
    payload.parentLocalId,
    payload.stationId,
    authResult.profileId
  );

  if (!parentCheck.valid) {
    return { success: false, error: parentCheck.error || "Invalid parent record", status: 400 };
  }

  // Generate upload key
  const uploadKey = generateUploadKey(
    payload.stationId,
    payload.deviceId,
    payload.evidenceLocalId
  );

  // Reserve evidence record in private.station_evidence_reserve
  const reservation = await reserveEvidenceRecord(
    supabase,
    payload,
    authResult.profileId,
    uploadKey,
    EVIDENCE_CONFIG
  );

  if (!reservation.success) {
    if (reservation.errorCode === "RESERVATION_CONFLICT") {
      return { success: false, error: reservation.error, status: 409 };
    }
    return { success: false, error: reservation.error, status: 500 };
  }

  return {
    success: true,
    evidenceLocalId: payload.evidenceLocalId,
    uploadUrl: reservation.uploadUrl,
    uploadMethod: reservation.uploadMethod,
    headers: reservation.headers,
    expiresAt: reservation.expiresAt,
    status: 200,
  };
}

/**
 * Thin adapter for evidence complete - local byte-check only, fail-closed.
 * Re-verifies reservation + actor device/station same, byte equality.
 * STORAGE_VERIFIER_UNAVAILABLE => no attachment writes, no fabricated success.
 * Evidence referenced by sync stays required pending.
 */
export async function completeEvidenceLocalByteCheckOnly(
  supabase: SupabaseClientTyped,
  payload: EvidenceCompleteRequest
): Promise<CompleteResultLocal> {
  // Validate required fields
  if (
    !payload.evidenceLocalId ||
    !payload.parentLocalId ||
    !payload.sha256 ||
    !payload.uploadedAtDevice ||
    !payload.deviceId ||
    !payload.stationId ||
    !payload.staffId
  ) {
    return { success: false, error: "Missing required fields", code: "MISSING_FIELDS", status: 400 };
  }

  // Validate SHA256
  if (!validateSha256(payload.sha256)) {
    return { success: false, error: "Invalid SHA256 hash format", code: "INVALID_SHA256", status: 400 };
  }

  // Validate uploadedAtDevice
  if (!validateUploadedAt(payload.uploadedAtDevice)) {
    return { success: false, error: "Invalid uploadedAtDevice timestamp", code: "INVALID_UPLOADED_AT", status: 400 };
  }

  // Verify auth only
  const authResult = await verifyAuthAndDevice(
    supabase,
    payload.deviceId,
    payload.stationId,
    payload.staffId
  );

  if (!authResult.authorized) {
    return { success: false, error: authResult.error || "Unauthorized", code: "UNAUTHORIZED", status: 401 };
  }

  // Re-verify reservation + actor device/station same actor device station
  const reservationCheck = await verifyEvidenceReservation(
    supabase,
    payload.evidenceLocalId,
    payload.parentLocalId,
    payload.stationId,
    authResult.profileId,
    payload.sha256
  );

  if (!reservationCheck.valid) {
    const statusMap: Record<string, number> = {
      reservation_not_found: 404,
      parent_mismatch: 400,
      station_mismatch: 400,
      staff_mismatch: 403,
      hash_mismatch: 409,
      invalid_status: 409,
    };
    return {
      success: false,
      error: reservationCheck.error || "Invalid reservation",
      code: reservationCheck.error || "INVALID_RESERVATION",
      status: statusMap[reservationCheck.error || ""] || 400,
    };
  }

  // Verify storage completion - LOCAL_BYTE_CHECK_ONLY
  const storageCheck = await verifyStorageCompletion(
    supabase,
    reservationCheck.uploadKey!,
    payload.sha256,
    reservationCheck.byteSize!
  );

  if (!storageCheck.valid) {
    if (storageCheck.error === "STORAGE_VERIFIER_UNAVAILABLE") {
      // STORAGE_VERIFIER_UNAVAILABLE: no attachment writes, no fabricated success
      return {
        success: false,
        error: "Storage verifier unavailable",
        code: "STORAGE_VERIFIER_UNAVAILABLE",
        status: 503,
      };
    }
    return {
      success: false,
      error: storageCheck.error || "Storage verification failed",
      code: storageCheck.error || "STORAGE_VERIFICATION_FAILED",
      status: 400,
    };
  }

  // Verify image integrity - LOCAL_BYTE_CHECK_ONLY
  const imageCheck = await verifyImageIntegrity(
    supabase,
    reservationCheck.uploadKey!,
    reservationCheck.mimeType!
  );

  if (!imageCheck.valid) {
    // LOCAL_BYTE_CHECK_ONLY - fail closed, no attachment writes
    return {
      success: false,
      error: imageCheck.error || "Image integrity check failed",
      code: imageCheck.error || "LOCAL_BYTE_CHECK_ONLY",
      status: 400,
    };
  }

  // Complete evidence - but only if verifier is available
  // If we got here, storage verifier was available and byte check passed
  const completeResult = await completeEvidence(
    supabase,
    payload.evidenceLocalId,
    payload.parentLocalId,
    payload.stationId,
    authResult.profileId,
    storageCheck.attachmentId!
  );

  if (!completeResult.success) {
    return {
      success: false,
      error: completeResult.error,
      code: completeResult.errorCode,
      status: 500,
    };
  }

  return {
    success: true,
    evidenceLocalId: payload.evidenceLocalId,
    serverAttachmentId: completeResult.serverAttachmentId,
    linked: completeResult.linked,
    status: 200,
  };
}