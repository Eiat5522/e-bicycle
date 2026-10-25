/** @jest-environment node */
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { ReadableStream } from "node:stream/web";
import { createLocalSupabaseEvidenceStorage } from "./evidence-supabase-local";
import { verifyEvidenceStorageBytes } from "./evidence-storage-verifier";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

const key = "11111111-1111-4111-8111-111111111111";
const policy = { allowedMimeTypes: ["image/bmp"], maxBytes: 1024, signedUploadExpirySeconds: 7200, timeoutMs: 1000, maxChunks: 10 };
function image() {
  const b = Buffer.alloc(58);
  b.write("BM"); b.writeUInt32LE(58, 2); b.writeUInt32LE(54, 10); b.writeUInt32LE(40, 14);
  b.writeInt32LE(1, 18); b.writeInt32LE(1, 22); b.writeUInt16LE(1, 26); b.writeUInt16LE(24, 28); b.writeUInt32LE(4, 34);
  return b;
}

test("rejects overlapping deferred pins and old expiry cannot clear replacement bytes", async () => {
  jest.useFakeTimers();
  const pending = deferred<Response>();
  const transport = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>().mockImplementationOnce(() => pending.promise)
    .mockImplementation(async () => new Response(image()));
  const storage = createLocalSupabaseEvidenceStorage({ origin: "http://127.0.0.1:54321", bucket: "staging", serviceKey: "local", policy, fetch: transport });
  const signal = new AbortController().signal;
  const concat = jest.spyOn(Buffer, "concat");
  try {
    const first = storage.pin({ objectKey: key }, signal);
    await expect(storage.pin({ objectKey: key }, signal)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
    expect(transport).toHaveBeenCalledTimes(1);
    pending.resolve(new Response(image()));
    const original = await first;
    const retained = concat.mock.results.at(-1)!.value as Buffer;
    await jest.advanceTimersByTimeAsync(500);
    const replacement = await storage.pin({ objectKey: key }, signal);
    expect(retained.every(byte => byte === 0)).toBe(true);
    await expect(storage.read({ objectKey: key, ifVersion: original.version }, signal)).rejects.toThrow();
    await jest.advanceTimersByTimeAsync(500);
    const read = await storage.read({ objectKey: key, ifVersion: replacement.version }, signal);
    const reader = read.body.getReader();
    expect((await reader.read()).value).toEqual(Uint8Array.from(image()));
  } finally { pending.resolve(new Response(image())); storage.dispose(); concat.mockRestore(); jest.useRealTimers(); }
});

test("terminal disposal aborts pending download and cancels late response without publishing", async () => {
  jest.useFakeTimers();
  const pending = deferred<Response>();
  let inner!: AbortSignal;
  const transport = jest.fn(async (_url: unknown, init?: RequestInit) => { inner = init!.signal!; return pending.promise; });
  const storage = createLocalSupabaseEvidenceStorage({ origin: "http://127.0.0.1:54321", bucket: "staging", serviceKey: "local", policy, fetch: transport });
  const signal = new AbortController().signal;
  try {
    const result = storage.pin({ objectKey: key }, signal);
    const rejected = expect(result).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
    storage.dispose(); storage.dispose();
    expect(inner.aborted).toBe(true);
    const cancel = jest.fn();
    pending.resolve(new Response(new ReadableStream({ cancel }) as unknown as BodyInit));
    await rejected;
    await jest.advanceTimersByTimeAsync(0);
    expect(cancel).toHaveBeenCalledTimes(1);
    await expect(storage.pin({ objectKey: key }, signal)).rejects.toThrow();
    await expect(storage.issueSignedUpload(key, signal)).rejects.toThrow();
    await expect(storage.read({ objectKey: key, ifVersion: "late" }, signal)).rejects.toThrow();
    expect(transport).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  } finally { pending.resolve(new Response(image())); storage.dispose(); jest.useRealTimers(); }
});

test("disposal zeroes a late noncooperative reader completion", async () => {
  jest.useFakeTimers();
  const pending = deferred<ReadableStreamReadResult<Uint8Array>>();
  const cancel = jest.fn(() => new Promise<void>(() => {}));
  const releaseLock = jest.fn();
  const response = { ok: true, body: { getReader: () => ({ read: () => pending.promise, cancel, releaseLock }) } } as unknown as Response;
  const storage = createLocalSupabaseEvidenceStorage({ origin: "http://127.0.0.1:54321", bucket: "staging", serviceKey: "local", policy, fetch: async () => response });
  try {
    const result = storage.pin({ objectKey: key }, new AbortController().signal);
    const rejected = expect(result).rejects.toThrow();
    await Promise.resolve(); await Promise.resolve();
    storage.dispose();
    const late = image();
    pending.resolve({ done: false, value: late });
    await jest.advanceTimersByTimeAsync(policy.timeoutMs);
    await rejected;
    expect(late.every(byte => byte === 0)).toBe(true);
    expect(cancel).toHaveBeenCalled();
    expect(releaseLock).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  } finally { storage.dispose(); jest.useRealTimers(); }
});

test("downloads actual HTTP bytes into a private snapshot, unaffected by later replacement", async () => {
  let bytes = image();
  const requests: string[] = [];
  const server = createServer((req, res) => {
    requests.push(req.url!);
    expect(req.headers.authorization).toBe("Bearer synthetic-local-key");
    res.end(bytes);
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address() as { port: number };
    const storage = createLocalSupabaseEvidenceStorage({ origin: `http://127.0.0.1:${address.port}`, bucket: "evidence-staging", serviceKey: "synthetic-local-key", policy });
    const signal = new AbortController().signal;
    const pin = await storage.pin({ objectKey: key }, signal);
    bytes = Buffer.alloc(58, 99);
    const result = await verifyEvidenceStorageBytes(key, {
      authorizeReservation: async () => ({ id: key, objectKey: key, actorProfileId: "actor", staffId: "staff", stationId: "station", deviceId: "device", parentKind: "rental_start", parentLocalId: "parent", declaredMime: "image/bmp", declaredSize: 58, declaredSha256: createHash("sha256").update(image()).digest("hex") }),
      storage: { pin: async () => pin, read: storage.read }, policy, signal,
      limits: { timeoutMs: 1000, maxReads: 10, maxChunks: 10, cleanupTimeoutMs: 10 },
    });
    expect(result).toMatchObject({ state: "LOCAL_BYTE_CHECK_ONLY", linked: false });
    expect(requests).toEqual([`/storage/v1/object/authenticated/evidence-staging/${key}`]);
    await expect(storage.read({ objectKey: key, ifVersion: pin.version }, signal)).rejects.toThrow();
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

test.each([undefined, { ...policy, signedUploadExpirySeconds: 60 }, { ...policy, maxBytes: 0 }, { ...policy, timeoutMs: 0 }, { ...policy, allowedMimeTypes: ["image/jpeg"] }])("rejects absent or unsupported explicit policy before network IO", p => {
  expect(() => createLocalSupabaseEvidenceStorage({ origin: "http://127.0.0.1:54321", bucket: "staging", serviceKey: "local", policy: p! })).toThrow("EVIDENCE_POLICY_UNAVAILABLE");
});
test.each(["http://127.1:54321", "http://2130706433:54321", "https://example.supabase.co", "http://localhost:54321", "http://127.0.0.1.evil.test", "http://user:pass@127.0.0.1:54321", "http://127.0.0.1:54321/path"]) ("refuses nonliteral-loopback or non-origin target %s", origin => {
  expect(() => createLocalSupabaseEvidenceStorage({ origin, bucket: "staging", serviceKey: "local", policy })).toThrow();
});
test("rejects oversized response and follows no redirects", async () => {
  const transport = jest.fn(async () => new Response(new Uint8Array(1025)));
  const storage = createLocalSupabaseEvidenceStorage({ origin: "http://127.0.0.1:54321", bucket: "staging", serviceKey: "local", policy, fetch: transport });
  await expect(storage.pin({ objectKey: key }, new AbortController().signal)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
  expect(transport).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ redirect: "error", cache: "no-store" }));
});
test("signed upload explicitly disables upsert and cannot claim configurable provider TTL", async () => {
  const transport = jest.fn(async () => Response.json({ url: `/object/upload/sign/staging/${key}?token=synthetic` }));
  const storage = createLocalSupabaseEvidenceStorage({ origin: "http://127.0.0.1:54321", bucket: "staging", serviceKey: "local", policy, fetch: transport });
  const result = await storage.issueSignedUpload(key, new AbortController().signal);
  expect(transport).toHaveBeenCalledWith(`http://127.0.0.1:54321/storage/v1/object/upload/sign/staging/${key}`, expect.objectContaining({ method: "POST", body: "{}", headers: expect.objectContaining({ "x-upsert": "false" }) }));
  expect(result).toMatchObject({ signedUploadExpirySeconds: 7200, state: "LOCAL_UPLOAD_TARGET_ONLY", linked: false });
});
test.each(["token=one&token=two", "token=one&token=", "token=", "token", "token=one#fragment", "token=one#", "token=one&%74oken=two"])("rejects ambiguous signed URL query or fragment %s", suffix => {
  const storage = createLocalSupabaseEvidenceStorage({ origin: "http://127.0.0.1:54321", bucket: "staging", serviceKey: "local", policy, fetch: async () => Response.json({ url: `/object/upload/sign/staging/${key}?${suffix}` }) });
  return expect(storage.issueSignedUpload(key, new AbortController().signal)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
});

test("rejects signer target substitution", async () => {
  const storage = createLocalSupabaseEvidenceStorage({ origin: "http://127.0.0.1:54321", bucket: "staging", serviceKey: "local", policy, fetch: async () => Response.json({ url: "https://evil.test/?token=secret" }) });
  await expect(storage.issueSignedUpload(key, new AbortController().signal)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
});
test("bounds noncooperative network and empty chunk streams", async () => {
  const storage = createLocalSupabaseEvidenceStorage({ origin: "http://127.0.0.1:54321", bucket: "staging", serviceKey: "local", policy: { ...policy, timeoutMs: 10 }, fetch: () => new Promise<Response>(() => {}) });
  await expect(storage.pin({ objectKey: key }, new AbortController().signal)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
  const empty = createLocalSupabaseEvidenceStorage({ origin: "http://127.0.0.1:54321", bucket: "staging", serviceKey: "local", policy, fetch: async () => new Response(new ReadableStream({ pull(c) { c.enqueue(new Uint8Array()); } }) as unknown as BodyInit) });
  await expect(empty.pin({ objectKey: key }, new AbortController().signal)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
});
