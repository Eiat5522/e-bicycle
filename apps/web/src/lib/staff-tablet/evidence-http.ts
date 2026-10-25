import "server-only";
import { NextResponse } from "next/server";
import { parseRequiredJsonObjectBody } from "@/app/api/_utils/json-body";
import { requireStaffTabletAccess, type StaffTabletAuthContext } from "@/lib/supabase/require-staff-tablet-access";
import type { LocalEvidenceWorkflow } from "./evidence-workflow-local";
import { operationalEvidenceWorkflow, type OperationalEvidenceWorkflow } from "./evidence-workflow";
import { verifyEvidenceStorageBytes, type EvidenceVerificationOptions, type VerifiedEvidenceReservation } from "./evidence-storage-verifier";

/** Trusted backend execution binds verified identity and revalidates it inside
 * the same transaction as private authorization. A service-role public RPC is
 * never the operational database transport. The legacy seam below is local-only.
 */
export interface EvidenceLocalVerificationAdapter {
  authorizeReservation(context: StaffTabletAuthContext, reservationId: string, signal: AbortSignal): Promise<VerifiedEvidenceReservation & { evidenceLocalId: string }>;
  storage: EvidenceVerificationOptions["storage"];
  policy: EvidenceVerificationOptions["policy"];
  limits: EvidenceVerificationOptions["limits"];
}
const parents = ["rider_registration", "rental_start", "rental_return"];
const kinds = ["pre_use_photo", "return_photo", "payment_slip", "incident_photo", "bike_check_photo", "battery_photo", "backup_form_photo"];
const identifier = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.trim() === v && !/[\u0000-\u001f\u007f]/u.test(v);
const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
function reply(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}
function uncached(response: Response) {
  const copy = new NextResponse(response.body, { status: response.status, headers: response.headers });
  copy.headers.set("Cache-Control", "private, no-store");
  return copy;
}
function unavailable() {
  return reply({ code: "EVIDENCE_CAPABILITY_UNAVAILABLE", message: "Approved evidence owner transport and storage are unavailable." }, 503);
}

/** Injection is server construction only, never a request-selected capability.
 * Without explicit operational configuration exported handlers remain fail-closed.
 */
export function createEvidencePost(operation: "init" | "complete", injectedAdapter?: EvidenceLocalVerificationAdapter | LocalEvidenceWorkflow | OperationalEvidenceWorkflow) {
  return async function evidencePost(request: Request) {
    try {
      const parsed = await parseRequiredJsonObjectBody(request);
      if (parsed.error) return uncached(parsed.error);
      const p = parsed.body;
      if (!identifier(p.deviceId) || !identifier(p.stationId) || !uuid(p.parentLocalId) ||
        !uuid(p.evidenceLocalId) || typeof p.parentKind !== "string" || !parents.includes(p.parentKind) ||
        typeof p.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(p.sha256) ||
        (operation === "init" && (typeof p.kind !== "string" || !kinds.includes(p.kind) ||
          typeof p.mimeType !== "string" || !/^[a-z]+\/[a-z0-9.+-]+$/.test(p.mimeType) || p.mimeType.length > 127 ||
          typeof p.byteSize !== "number" || !Number.isSafeInteger(p.byteSize) || p.byteSize <= 0)) ||
        (operation === "complete" && (!uuid(p.reservationId) || typeof p.uploadedAtDevice !== "string" ||
          !Number.isFinite(Date.parse(p.uploadedAtDevice)) || Date.parse(p.uploadedAtDevice) > Date.now() + 60000))) {
        return reply({ message: "Invalid evidence request." }, 400);
      }
      const auth = await requireStaffTabletAccess(request, { deviceId: p.deviceId, stationId: p.stationId });
      if ("error" in auth) return uncached(auth.error);
      // Optional claimed identity is never authority; reject disagreement.
      if ((p.staffId !== undefined && p.staffId !== auth.context.staffId) ||
        (p.actorProfileId !== undefined && p.actorProfileId !== auth.context.userId)) {
        return reply({ message: "Invalid evidence request identity." }, 403);
      }
      // Only explicit server configuration enables operational transport.
      const adapter = injectedAdapter ?? operationalEvidenceWorkflow();
      if (adapter && "mode" in adapter) {
        if (!["LOCAL_SYNTHETIC_ONLY", "OPERATIONAL_DATABASE_SNAPSHOT_V1"].includes(adapter.mode)) return unavailable();
        return reply(await adapter[operation](auth.context, p, request.signal), 200);
      }
      if (operation === "init" || !adapter) return unavailable();
      const reservationId = p.reservationId as string;
      await verifyEvidenceStorageBytes(reservationId, {
        storage: adapter.storage, policy: adapter.policy, limits: adapter.limits, signal: request.signal,
        authorizeReservation: async (id, signal) => {
          const r = await adapter.authorizeReservation(auth.context, id, signal);
          if (r.id !== reservationId || r.evidenceLocalId !== p.evidenceLocalId ||
            r.actorProfileId !== auth.context.userId || r.staffId !== auth.context.staffId ||
            r.deviceId !== auth.context.deviceId || r.stationId !== auth.context.stationId ||
            r.parentLocalId !== p.parentLocalId || r.parentKind !== p.parentKind || r.declaredSha256 !== p.sha256) {
            throw new Error("DENIED");
          }
          return r;
        },
      });
      return reply({ code: "STORAGE_VERIFIER_UNAVAILABLE", message: "Local byte checks cannot authorize attachment linkage." }, 503);
    } catch (error) {
      if (error instanceof Error && error.message === "EVIDENCE_COMPLETION_CONFLICT") {
        return reply({ code: "EVIDENCE_COMPLETION_CONFLICT", message: "Evidence completion conflicts with the durable receipt." }, 409);
      }
      if (error instanceof Error && ["DENIED", "FORBIDDEN"].includes(error.message)) {
        return reply({ message: "Evidence reservation denied." }, 403);
      }
      if (error instanceof Error && error.message === "EVIDENCE_STORAGE_VERIFICATION_FAILED") {
        return reply({ code: "EVIDENCE_BYTES_REJECTED", message: "Evidence byte verification failed." }, 422);
      }
      return reply({ message: "Unable to process evidence request." }, 503);
    }
  };
}
