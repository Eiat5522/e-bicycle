import "server-only";
import { createHash } from "node:crypto";
import type { ReadableStream, ReadableStreamDefaultReader } from "node:stream/web";

/** Only server authorization code may construct this context. Never map request fields here. */
export interface VerifiedEvidenceReservation {
  id: string;
  objectKey: string;
  actorProfileId: string;
  staffId: string;
  stationId: string;
  deviceId: string;
  parentLocalId: string;
  parentKind: string;
  declaredMime: string;
  declaredSize: number;
  declaredSha256: string;
}

/** Local byte-check adapter only: returned generations/conditions are untrusted claims.
 * No provider-level assurance is available until a production adapter is separately reviewed.
 * Implementations must honor AbortSignal for pin/open, dispose late responses, and
 * must not select a URL from user input. Racing cannot forcibly stop their promises.
 */
export interface EvidenceByteStorage {
  pin(target: { objectKey: string }, signal: AbortSignal): Promise<{ objectKey: string; version: string }>;
  read(target: { objectKey: string; ifVersion: string }, signal: AbortSignal): Promise<{
    objectKey: string;
    version: string;
    conditionApplied: boolean;
    body: ReadableStream<Uint8Array>;
  }>;
}
export interface EvidenceVerificationOptions {
  authorizeReservation(id: string, signal: AbortSignal): Promise<VerifiedEvidenceReservation>;
  storage: EvidenceByteStorage;
  policy: { allowedMimeTypes: readonly string[]; maxBytes: number };
  signal: AbortSignal;
  limits: { timeoutMs: number; maxReads: number; maxChunks: number; cleanupTimeoutMs: number };
}

/** Deliberately narrow image support: Windows BITMAPINFOHEADER, BI_RGB, 24-bit,
 * positive dimensions, no palettes/profiles/trailing payload. This validates the
 * complete raster layout, not just a magic prefix. No JPEG/PNG approval implied.
 */
function detectImage(bytes: Buffer): string {
  if (bytes.length < 54 || bytes.toString("ascii", 0, 2) !== "BM" ||
    bytes.readUInt32LE(2) !== bytes.length || bytes.readUInt32LE(6) !== 0 ||
    bytes.readUInt32LE(10) !== 54 || bytes.readUInt32LE(14) !== 40 ||
    bytes.readUInt16LE(26) !== 1 || bytes.readUInt16LE(28) !== 24 ||
    bytes.readUInt32LE(30) !== 0 || bytes.readUInt32LE(46) !== 0 || bytes.readUInt32LE(50) !== 0) {
    throw new Error("EVIDENCE_IMAGE_INVALID");
  }
  const width = bytes.readInt32LE(18);
  const height = bytes.readInt32LE(22);
  const rasterSize = Math.ceil(width * 3 / 4) * 4 * height;
  const declaredRaster = bytes.readUInt32LE(34);
  if (width <= 0 || height <= 0 || !Number.isSafeInteger(rasterSize) ||
    rasterSize !== bytes.length - 54 || (declaredRaster !== 0 && declaredRaster !== rasterSize)) {
    throw new Error("EVIDENCE_IMAGE_INVALID");
  }
  return "image/bmp";
}

function isExplicitDenyError(error: Error): boolean {
  return error.message === "DENIED" || error.message === "FORBIDDEN";
}

/** Pure verification only. Does NOT call SQL, complete evidence, or create links.
 * Always LOCAL_BYTE_CHECK_ONLY, never proof of provider immutability.
 * A returned storage observation still needs a transactional reservation/version/
 * parent revalidation processor before admission can open.
 */
export async function verifyEvidenceStorageBytes(id: string, options: EvidenceVerificationOptions) {
  const { policy, storage, limits, signal } = options;
  if (!limits || ![limits.timeoutMs, limits.maxReads, limits.maxChunks, limits.cleanupTimeoutMs].every(v => Number.isSafeInteger(v) && v > 0) ||
    limits.timeoutMs > 2_147_483_647 || limits.cleanupTimeoutMs > 2_147_483_647 ||
    !(signal instanceof AbortSignal)) throw new Error("EVIDENCE_POLICY_UNAVAILABLE");
  if (!policy || !Number.isSafeInteger(policy.maxBytes) || policy.maxBytes <= 0 ||
    !Array.isArray(policy.allowedMimeTypes) || policy.allowedMimeTypes.length === 0 ||
    policy.allowedMimeTypes.some(m => m !== "image/bmp")) throw new Error("EVIDENCE_POLICY_UNAVAILABLE");

  // Check for pre-abort before any authorization
  if (signal.aborted) throw new Error("EVIDENCE_STORAGE_VERIFICATION_FAILED");

  // Create abort controller bound to overall timeout AND caller signal
  const abort = new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const onAbort = () => abort.abort();
  signal.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(onAbort, limits.timeoutMs);

  // Race every provider operation; rejection handlers remain attached to late work.
  // This bounds our wait, not an uncooperative adapter's underlying work. Adapters
  // must honor the signal, including disposing a late-opened response body.
  async function bounded<T>(operation: () => Promise<T>): Promise<T> {
    if (abort.signal.aborted) throw new Error();
    let stop: () => void = () => {};
    const interrupted = new Promise<never>((_, reject) => {
      stop = () => reject(new Error());
      abort.signal.addEventListener("abort", stop, { once: true });
    });
    try { return await Promise.race([Promise.resolve().then(operation), interrupted]); }
    finally { abort.signal.removeEventListener("abort", stop); }
  }

  try {
    let r: VerifiedEvidenceReservation;
    try {
      // Bounded authorization with timeout and caller signal propagation
      r = await bounded(() => options.authorizeReservation(id, abort.signal));
    } catch (authError) {
      abort.abort();

      // Explicit deny semantics propagate through
      if (authError instanceof Error && isExplicitDenyError(authError)) {
        throw authError;
      }
      // All other auth errors (including secrets, stalls, timeouts) sanitized
      throw new Error("EVIDENCE_STORAGE_VERIFICATION_FAILED");
    }

    if (r.id !== id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(r.objectKey) ||
      ![r.actorProfileId, r.staffId, r.stationId, r.deviceId, r.parentLocalId, r.parentKind].every(v => typeof v === "string" && v.length > 0) ||
      !Number.isSafeInteger(r.declaredSize) || r.declaredSize <= 0 || r.declaredSize > policy.maxBytes ||
      !/^[0-9a-f]{64}$/.test(r.declaredSha256) || !policy.allowedMimeTypes.includes(r.declaredMime)) {
      throw new Error("EVIDENCE_RESERVATION_INVALID");
    }

    try {
      const pinned = await bounded(() => storage.pin({ objectKey: r.objectKey }, abort.signal));
      if (pinned.objectKey !== r.objectKey || typeof pinned.version !== "string" || !pinned.version) throw new Error();
      const response = await bounded(() => storage.read({ objectKey: r.objectKey, ifVersion: pinned.version }, abort.signal));
      reader = response.body.getReader();
      if (response.objectKey !== r.objectKey || response.version !== pinned.version || response.conditionApplied !== true) throw new Error();
      const chunks: Buffer[] = [];
      let size = 0;
      let reads = 0;
      let chunkCount = 0;
      const hash = createHash("sha256");
      while (true) {
        if (++reads > limits.maxReads) throw new Error();
        const { value, done } = await bounded(() => reader!.read());
        if (done) break;
        if (++chunkCount > limits.maxChunks || !(value instanceof Uint8Array)) throw new Error();
        if (value.byteLength === 0) continue;
        size += value.byteLength;
        if (size > policy.maxBytes || size > r.declaredSize) throw new Error();
        const chunk = Buffer.from(value);
        hash.update(chunk); chunks.push(chunk);
      }
      const sha256 = hash.digest("hex");
      if (size !== r.declaredSize || sha256 !== r.declaredSha256) throw new Error();
      const mime = detectImage(Buffer.concat(chunks, size));
      if (mime !== r.declaredMime || !policy.allowedMimeTypes.includes(mime)) throw new Error();
      return { state: "LOCAL_BYTE_CHECK_ONLY" as const, reservationId: r.id, objectKey: r.objectKey,
        version: pinned.version, observedSize: size, observedSha256: sha256,
        observedMime: mime, linked: false as const };
    } catch {
      abort.abort();
      if (reader) {
        let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            Promise.resolve().then(() => reader!.cancel()).catch(() => {}),
            new Promise<void>(resolve => { cleanupTimer = setTimeout(resolve, limits.cleanupTimeoutMs); }),
          ]);
        } finally { clearTimeout(cleanupTimer); }
      }
      throw new Error("EVIDENCE_STORAGE_VERIFICATION_FAILED");
    }
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
    reader?.releaseLock();
  }
}