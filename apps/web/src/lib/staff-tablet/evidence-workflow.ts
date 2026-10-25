import "server-only";
import { createHash } from "node:crypto";
import type { StaffTabletAuthContext } from "../supabase/require-staff-tablet-access";
import { OperationalEvidenceOwner } from "./evidence-owner";
import { OperationalEvidenceStorage } from "./evidence-storage";
import { validateOperationalEvidenceImage } from "./evidence-image";

export interface OperationalEvidenceWorkflow {
  readonly mode: "OPERATIONAL_DATABASE_SNAPSHOT_V1";
  init(context: StaffTabletAuthContext, payload: Record<string, unknown>, signal: AbortSignal): Promise<unknown>;
  complete(context: StaffTabletAuthContext, payload: Record<string, unknown>, signal: AbortSignal): Promise<unknown>;
}
let singleton: OperationalEvidenceWorkflow | undefined;
/** Explicit server config only. The URL is a dedicated DB login, never an owner
 * or service-role transport. The Storage service key is confined to staging.
 * No missing/invalid configuration can select the synthetic local adapter.
 */
export function operationalEvidenceWorkflow(env: Record<string, string | undefined> = process.env): OperationalEvidenceWorkflow | undefined {
  if (env === process.env && singleton) return singleton;
  if (env.API08_EVIDENCE_MODE !== "OPERATIONAL_DATABASE_SNAPSHOT_V1" || !env.API08_DATABASE_URL || !env.API08_DATABASE_CA ||
    !env.API08_STORAGE_ORIGIN || !env.API08_STORAGE_BUCKET || !env.API08_STORAGE_SERVICE_KEY) return;
  try {
    const storage = new OperationalEvidenceStorage({ origin: env.API08_STORAGE_ORIGIN, bucket: env.API08_STORAGE_BUCKET, serviceKey: env.API08_STORAGE_SERVICE_KEY });
    const owner = new OperationalEvidenceOwner({ connectionString: env.API08_DATABASE_URL, ca: env.API08_DATABASE_CA });
    let active = 0;
    // Bound downloads and full raster allocations together, not just pool slots.
    async function bounded<T>(operation: (signal: AbortSignal) => Promise<T>, signal: AbortSignal) {
      if (active >= 2 || signal.aborted) throw new Error("EVIDENCE_OWNER_UNAVAILABLE");
      active++;
      const deadline = AbortSignal.any([signal, AbortSignal.timeout(30000)]);
      try { return await operation(deadline); } finally { active--; }
    }
    const workflow: OperationalEvidenceWorkflow = {
      mode: "OPERATIONAL_DATABASE_SNAPSHOT_V1",
      init(context, payload, signal) {
        return bounded(async abort => {
          const r = await owner.execute(context, "init", payload, null, abort);
          if (!r || typeof r.object_key !== "string") throw new Error("EVIDENCE_OWNER_UNAVAILABLE");
          const target = await storage.issueSignedUpload(r.object_key, abort);
          return { ...target, reservationId: r.id, evidenceLocalId: r.evidence_local_id, objectKey: r.object_key,
            headers: { "content-type": r.declared_mime, "x-upsert": "false" } };
        }, signal);
      },
      complete(context, payload, signal) {
        return bounded(async abort => {
          const r = await owner.execute(context, "authorize", payload, null, abort);
          if (!r || typeof r.object_key !== "string" || typeof r.declared_mime !== "string") throw new Error("DENIED");
          const receipt = await owner.execute(context, "receipt", payload, null, abort);
          if (receipt) {
            if (receipt.uploadedAtDevice !== payload.uploadedAtDevice) throw new Error("EVIDENCE_COMPLETION_CONFLICT");
            return receipt;
          }
          const bytes = await storage.download(r.object_key, abort);
          try {
            if (bytes.length !== Number(r.declared_size) || createHash("sha256").update(bytes).digest("hex") !== r.declared_sha256) throw new Error("EVIDENCE_STORAGE_VERIFICATION_FAILED");
            await validateOperationalEvidenceImage(bytes, r.declared_mime);
            if (abort.aborted) throw new Error("EVIDENCE_OWNER_UNAVAILABLE");
            // Current actor, policy, parent/reference, hash, size and format are
            // rechecked in SQL before snapshot/link/required-parent transition.
            return await owner.execute(context, "complete", payload, bytes, abort);
          } finally { bytes.fill(0); }
        }, signal);
      },
    };
    if (env === process.env) singleton = workflow;
    return workflow;
  } catch { return; }
}
