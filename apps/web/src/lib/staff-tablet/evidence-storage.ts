import "server-only";
import { OPERATIONAL_EVIDENCE_MAX_BYTES } from "./evidence-image";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const fail = () => new Error("EVIDENCE_STORAGE_VERIFICATION_FAILED");
/** Private upload staging only. Durable authority is the committed DB snapshot.
 * No arbitrary URL fetch, redirects, upsert, object deletion or retention claims.
 */
export class OperationalEvidenceStorage {
  private readonly base: string;
  private readonly bucket: string;
  private readonly serviceKey: string;
  constructor(config: { origin: string; bucket: string; serviceKey: string }) {
    const origin = new URL(config.origin);
    if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash ||
      !/^[a-z0-9][a-z0-9-]{0,62}$/.test(config.bucket) || !config.serviceKey || /[\r\n]/.test(config.serviceKey)) throw fail();
    this.base = `${origin.origin}/storage/v1`;
    this.bucket = config.bucket;
    this.serviceKey = config.serviceKey;
  }
  private async request(path: string, method: string, signal: AbortSignal, cap: number): Promise<Buffer> {
    const controller = new AbortController();
    const stop = () => controller.abort();
    signal.addEventListener("abort", stop, { once: true });
    const timer = setTimeout(stop, 10000);
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let rejectAbort: () => void = () => {};
    const chunks: Buffer[] = [];
    const interrupted = new Promise<never>((_, reject) => {
      rejectAbort = () => { void reader?.cancel().catch(() => {}); reject(fail()); };
      controller.signal.addEventListener("abort", rejectAbort, { once: true });
    });
    try {
      if (signal.aborted) throw fail();
      const work = (async () => {
        const response = await fetch(`${this.base}${path}`, { method, redirect: "error", cache: "no-store", signal: controller.signal,
          headers: { authorization: `Bearer ${this.serviceKey}`, apikey: this.serviceKey, "content-type": "application/json", "x-upsert": "false" },
          ...(method === "POST" ? { body: "{}" } : {}) });
        if (controller.signal.aborted || !response.ok || !response.body) { void response.body?.cancel().catch(() => {}); throw fail(); }
        const length = response.headers.get("content-length");
        if (length && (!/^\d+$/.test(length) || Number(length) > cap)) { void response.body.cancel().catch(() => {}); throw fail(); }
        reader = response.body.getReader();
        let size = 0;
        try {
          for (let i = 0; i < 4096; i++) {
            const { value, done } = await reader.read();
            if (controller.signal.aborted) throw fail();
            if (done) return Buffer.concat(chunks, size);
            if (!(value instanceof Uint8Array) || (size += value.byteLength) > cap) throw fail();
            if (value.byteLength) chunks.push(Buffer.from(value));
          }
          throw fail();
        } finally { void reader.cancel().catch(() => {}); reader.releaseLock(); }
      })();
      return await Promise.race([work, interrupted]);
    } catch { controller.abort(); throw fail(); }
    finally {
      clearTimeout(timer); signal.removeEventListener("abort", stop); controller.signal.removeEventListener("abort", rejectAbort);
      for (const chunk of chunks) chunk.fill(0);
    }
  }
  private async assertPrivate(signal: AbortSignal) {
    const bytes = await this.request(`/bucket/${this.bucket}`, "GET", signal, 16384);
    try {
      const bucket = JSON.parse(bytes.toString("utf8"));
      if (bucket.id !== this.bucket || bucket.public !== false) throw fail();
    } finally { bytes.fill(0); }
  }
  async issueSignedUpload(objectKey: string, signal: AbortSignal) {
    if (!uuid.test(objectKey)) throw fail();
    await this.assertPrivate(signal);
    const path = `/object/upload/sign/${this.bucket}/${objectKey}`;
    const bytes = await this.request(path, "POST", signal, 16384);
    try {
      const result = JSON.parse(bytes.toString("utf8"));
      if (typeof result.url !== "string" || !result.url.startsWith(`${path}?`) || result.url.includes("#")) throw fail();
      const url = new URL(`${this.base}${result.url}`);
      if (url.pathname !== `/storage/v1${path}` || url.searchParams.getAll("token").length !== 1 ||
        !url.searchParams.get("token") || [...url.searchParams.keys()].some(key => key !== "token")) throw fail();
      return { uploadUrl: url.href, uploadMethod: "PUT", signedUploadExpirySeconds: 7200,
        expiresAt: new Date(Date.now() + 7200 * 1000).toISOString() };
    } finally { bytes.fill(0); }
  }
  async download(objectKey: string, signal: AbortSignal) {
    if (!uuid.test(objectKey)) throw fail();
    await this.assertPrivate(signal);
    return this.request(`/object/authenticated/${this.bucket}/${objectKey}`, "GET", signal, OPERATIONAL_EVIDENCE_MAX_BYTES);
  }
}
