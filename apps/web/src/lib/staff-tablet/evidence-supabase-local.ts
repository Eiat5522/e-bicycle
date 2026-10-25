import "server-only";
import { randomUUID } from "node:crypto";
import { ReadableStream } from "node:stream/web";
import type { EvidenceByteStorage } from "./evidence-storage-verifier";

export interface LocalEvidenceStoragePolicy {
  allowedMimeTypes: readonly string[];
  maxBytes: number;
  /** Supabase signed uploads currently have fixed two-hour validity. No shorter TTL is claimed. */
  signedUploadExpirySeconds: number;
  timeoutMs: number;
  maxChunks: number;
}

/** LOCAL ONLY. Not wired to routes; refuses hosted targets. A pin is a bounded,
 * private in-memory snapshot of the downloaded response, NOT a Storage generation
 * or provider attestation. Single-use reads prevent retention/reuse across requests.
 * Does not persist objects, finalize attachments or claim durable immutability.
 */
export function createLocalSupabaseEvidenceStorage(options: {
  origin: string; bucket: string; serviceKey: string; policy: LocalEvidenceStoragePolicy;
  fetch?: typeof fetch;
}): EvidenceByteStorage & {
  issueSignedUpload(objectKey: string, signal: AbortSignal): Promise<{
    signedUrl: string; signedUploadExpirySeconds: number; state: "LOCAL_UPLOAD_TARGET_ONLY"; linked: false;
  }>;
  dispose(): void;
} {
  const { policy } = options;
  if (!policy || policy.signedUploadExpirySeconds !== 7200 ||
    ![policy.maxBytes, policy.timeoutMs, policy.maxChunks].every(n => Number.isSafeInteger(n) && n > 0) ||
    policy.timeoutMs > 2_147_483_647 || !Array.isArray(policy.allowedMimeTypes) ||
    policy.allowedMimeTypes.length === 0 || policy.allowedMimeTypes.some(m => m !== "image/bmp")) {
    throw new Error("EVIDENCE_POLICY_UNAVAILABLE");
  }
  const origin = new URL(options.origin);
  if (!/^http:\/\/127\.0\.0\.1(?::[0-9]+)?\/?$/.test(options.origin) || origin.protocol !== "http:" || origin.hostname !== "127.0.0.1" || origin.username || origin.password ||
    origin.pathname !== "/" || origin.search || origin.hash || !/^[a-z0-9][a-z0-9-]*$/.test(options.bucket) ||
    !options.serviceKey || /[\r\n]/.test(options.serviceKey)) throw new Error("EVIDENCE_LOCAL_TARGET_REQUIRED");
  const base = `${origin.origin}/storage/v1`;
  const transport = options.fetch ?? fetch;
  let snapshot: { objectKey: string; version: string; bytes: Uint8Array; timer: ReturnType<typeof setTimeout> } | undefined;
  let pinPending = false;
  let disposed = false;
  const requests = new Set<AbortController>();
  const fail = () => new Error("EVIDENCE_STORAGE_VERIFICATION_FAILED");
  function key(value: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)) throw fail();
    return value;
  }
  function clearSnapshot() {
    if (snapshot) { clearTimeout(snapshot.timer); snapshot.bytes.fill(0); snapshot = undefined; }
  }
  // Terminal and idempotent. Already returned read streams belong to the caller.
  function dispose() {
    disposed = true;
    clearSnapshot();
    for (const controller of requests) controller.abort();
  }
  async function request<T>(path: string, signal: AbortSignal, init: RequestInit, consume: (response: Response, signal: AbortSignal) => Promise<T>) {
    if (disposed || signal.aborted) throw fail();
    const controller = new AbortController();
    requests.add(controller);
    const stop = () => controller.abort();
    signal.addEventListener("abort", stop, { once: true });
    const timer = setTimeout(stop, policy.timeoutMs);
    let rejectAbort: () => void = () => {};
    const interrupted = new Promise<never>((_, reject) => {
      rejectAbort = () => reject(fail());
      controller.signal.addEventListener("abort", rejectAbort, { once: true });
    });
    try {
      const work = (async () => {
        const response = await transport(`${base}${path}`, { ...init, redirect: "error", cache: "no-store", signal: controller.signal,
          headers: { authorization: `Bearer ${options.serviceKey}`, apikey: options.serviceKey, "content-type": "application/json", "x-upsert": "false" } });
        if (controller.signal.aborted || !response.ok) {
          void response.body?.cancel().catch(() => {}); throw fail();
        }
        return consume(response, controller.signal);
      })();
      return await Promise.race([work, interrupted]);
    } catch { controller.abort(); throw fail(); }
    finally { requests.delete(controller); clearTimeout(timer); signal.removeEventListener("abort", stop); controller.signal.removeEventListener("abort", rejectAbort); }
  }
  async function bytes(response: Response, signal: AbortSignal, maxBytes: number) {
    if (!response.body) throw fail();
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    let finished = false;
    // Cancellation is not awaited: an uncooperative stream cannot extend our budget.
    const stop = () => { void reader.cancel().catch(() => {}); };
    signal.addEventListener("abort", stop, { once: true });
    try {
      for (let count = 0; count < policy.maxChunks; count++) {
        const { value, done } = await reader.read();
        if (signal.aborted) { if (value instanceof Uint8Array) value.fill(0); throw fail(); }
        if (done) { finished = true; return Buffer.concat(chunks, size); }
        if (!(value instanceof Uint8Array) || (size += value.byteLength) > maxBytes) throw fail();
        if (value.byteLength) chunks.push(Uint8Array.from(value));
      }
      throw fail();
    } finally {
      signal.removeEventListener("abort", stop);
      for (const chunk of chunks) chunk.fill(0);
      if (!finished) stop();
      reader.releaseLock();
    }
  }
  return {
    dispose,
    async pin(target, signal) {
      key(target.objectKey);
      if (disposed || pinPending) throw fail();
      pinPending = true;
      clearSnapshot();
      try {
        const data = await request(`/object/authenticated/${options.bucket}/${target.objectKey}`, signal, { method: "GET" },
          (response, inner) => bytes(response, inner, policy.maxBytes));
        if (disposed || signal.aborted) { data.fill(0); throw fail(); }
        const version = `local-snapshot:${randomUUID()}`;
        snapshot = { objectKey: target.objectKey, version, bytes: data, timer: setTimeout(clearSnapshot, policy.timeoutMs) };
        snapshot.timer.unref?.();
        return { objectKey: target.objectKey, version };
      } finally { pinPending = false; }
    },
    async read(target, signal) {
      if (disposed || signal.aborted || !snapshot || snapshot.objectKey !== target.objectKey || snapshot.version !== target.ifVersion) throw fail();
      const data = Uint8Array.from(snapshot.bytes);
      clearSnapshot();
      return { objectKey: target.objectKey, version: target.ifVersion, conditionApplied: true,
        body: new ReadableStream<Uint8Array>({ start(c) { c.enqueue(data); c.close(); } }) };
    },
    async issueSignedUpload(objectKey, signal) {
      key(objectKey);
      const path = `/object/upload/sign/${options.bucket}/${objectKey}`;
      const result = await request(path, signal, { method: "POST", body: "{}" }, async (response, inner) => {
        const raw: unknown = JSON.parse((await bytes(response, inner, policy.maxBytes)).toString("utf8"));
        if (!raw || typeof raw !== "object" || !("url" in raw) || typeof raw.url !== "string") throw fail();
        const target = new URL(`${base}${raw.url}`);
        if (!raw.url.startsWith(`${path}?`) || target.origin !== origin.origin || target.pathname !== `/storage/v1${path}` ||
          raw.url.includes("#") || target.searchParams.getAll("token").length !== 1 ||
          !target.searchParams.get("token") || Array.from(target.searchParams.keys()).some(k => k !== "token")) throw fail();
        return target.href;
      });
      return { signedUrl: result, signedUploadExpirySeconds: 7200, state: "LOCAL_UPLOAD_TARGET_ONLY", linked: false };
    },
  };
}
