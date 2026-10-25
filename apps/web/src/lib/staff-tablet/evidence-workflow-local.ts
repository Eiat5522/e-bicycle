import "server-only";
import { ReadableStream } from "node:stream/web";
import type { StaffTabletAuthContext } from "../supabase/require-staff-tablet-access";
import { LocalEvidenceOwner, type LocalEvidenceOwnerConfig } from "./evidence-owner-local";
import { createLocalSupabaseEvidenceStorage, type LocalEvidenceStoragePolicy } from "./evidence-supabase-local";
import { verifyEvidenceStorageBytes, type EvidenceByteStorage } from "./evidence-storage-verifier";

export interface LocalEvidenceWorkflow {
  readonly mode: "LOCAL_SYNTHETIC_ONLY";
  init(context: StaffTabletAuthContext, payload: Record<string, unknown>, signal: AbortSignal): Promise<unknown>;
  complete(context: StaffTabletAuthContext, payload: Record<string, unknown>, signal: AbortSignal): Promise<unknown>;
}
/** Explicit construction only. No environment toggle wires this into public routes.
 * PostgreSQL owns the durable copy. Storage is upload staging, NOT immutable storage.
 * Each operation owns/disposes a separate adapter, preserving its reviewed lifecycle.
 */
export function createLocalEvidenceWorkflow(config: {
  owner: LocalEvidenceOwnerConfig;
  storage: { origin: string; bucket: string; serviceKey: string; policy: LocalEvidenceStoragePolicy };
}): LocalEvidenceWorkflow {
  const owner = new LocalEvidenceOwner(config.owner);
  const storageConfig = { ...config.storage, policy: { ...config.storage.policy, allowedMimeTypes: [...config.storage.policy.allowedMimeTypes] } };
  // Validate local target and explicit policy before reserving anything.
  createLocalSupabaseEvidenceStorage(storageConfig).dispose();
  return {
    mode: "LOCAL_SYNTHETIC_ONLY",
    async init(context, payload, signal) {
      const storage = createLocalSupabaseEvidenceStorage(storageConfig);
      try {
        const r = await owner.reserve(context, payload as Parameters<LocalEvidenceOwner["reserve"]>[1], signal);
        const issuedAfter = Date.now();
        const target = await storage.issueSignedUpload(r.objectKey, signal);
        return { ...target, uploadUrl: target.signedUrl, uploadMethod: "PUT", headers: { "content-type": r.declaredMime, "x-upsert": "false" }, expiresAt: new Date(issuedAfter + target.signedUploadExpirySeconds * 1000).toISOString(), reservationId: r.id, evidenceLocalId: r.evidenceLocalId, objectKey: r.objectKey, mode: "LOCAL_SYNTHETIC_ONLY" };
      } finally { storage.dispose(); }
    },
    async complete(context, payload, signal) {
      const r = await owner.authorize(context, payload.reservationId as string, signal);
      if (r.evidenceLocalId !== payload.evidenceLocalId || r.parentLocalId !== payload.parentLocalId ||
        r.parentKind !== payload.parentKind || r.declaredSha256 !== payload.sha256 ||
        r.actorProfileId !== context.userId || r.staffId !== context.staffId || r.deviceId !== context.deviceId || r.stationId !== context.stationId) throw new Error("DENIED");
      // Reauthorize + parent revalidate before returning an existing durable receipt.
      const old = await owner.receipt(context, r.id, signal);
      if (old) {
        if (typeof old !== "object" || !("uploadedAtDevice" in old) || old.uploadedAtDevice !== payload.uploadedAtDevice) throw new Error("EVIDENCE_COMPLETION_CONFLICT");
        return old;
      }
      const storage = createLocalSupabaseEvidenceStorage(storageConfig);
      const chunks: Buffer[] = [];
      let size = 0;
      const capturing: EvidenceByteStorage = {
        pin: (target, abort) => storage.pin(target, abort),
        async read(target, abort) {
          const source = await storage.read(target, abort);
          const reader = source.body.getReader();
          let released = false;
          const release = () => { if (!released) { released = true; reader.releaseLock(); } };
          return { ...source, body: new ReadableStream<Uint8Array>({
            async pull(controller) {
              try {
                const { value, done } = await reader.read();
                if (done) { release(); controller.close(); return; }
                if (!(value instanceof Uint8Array) || value.byteLength > r.declaredSize - size) throw new Error("EVIDENCE_BYTES_REJECTED");
                const copy = Buffer.from(value);
                size += copy.length; chunks.push(copy);
                controller.enqueue(copy);
              } catch (error) { controller.error(error); try { await reader.cancel(); } finally { release(); } }
            },
            async cancel() { try { await reader.cancel(); } finally { release(); } },
          }, { highWaterMark: 0 }) };
        },
      };
      try {
        await verifyEvidenceStorageBytes(r.id, { authorizeReservation: async () => r, storage: capturing,
          policy: storageConfig.policy, signal,
          limits: { timeoutMs: storageConfig.policy.timeoutMs, maxReads: storageConfig.policy.maxChunks + 1, maxChunks: storageConfig.policy.maxChunks, cleanupTimeoutMs: storageConfig.policy.timeoutMs },
        });
        const bytes = Buffer.concat(chunks, size);
        try { return await owner.finalize(context, r.id, bytes, payload.uploadedAtDevice as string, signal); }
        finally { bytes.fill(0); }
      } finally { storage.dispose(); for (const chunk of chunks) chunk.fill(0); }
    },
  };
}
