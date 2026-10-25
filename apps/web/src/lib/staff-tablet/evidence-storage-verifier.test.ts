/** @jest-environment node */
import { createHash } from "node:crypto";
import { ReadableStream } from "node:stream/web";
import { verifyEvidenceStorageBytes, type VerifiedEvidenceReservation } from "./evidence-storage-verifier";

function image() {
  // Complete 1x1, bottom-up, uncompressed 24-bit Windows BMP including row padding.
  const b = Buffer.alloc(58);
  b.write("BM"); b.writeUInt32LE(58, 2); b.writeUInt32LE(54, 10);
  b.writeUInt32LE(40, 14); b.writeInt32LE(1, 18); b.writeInt32LE(1, 22);
  b.writeUInt16LE(1, 26); b.writeUInt16LE(24, 28); b.writeUInt32LE(4, 34);
  b[54] = 255;
  return b;
}
const key = "11111111-1111-4111-8111-111111111111";
function setup(bytes = image()) {
  const reservation = { id: key, objectKey: key, actorProfileId: "actor", staffId: "staff", stationId: "station", deviceId: "device", parentLocalId: "parent", parentKind: "rental_start", declaredMime: "image/bmp", declaredSize: bytes.length, declaredSha256: createHash("sha256").update(bytes).digest("hex") };
  const cancel = jest.fn();
  const storage = {
    assurance: "LOCAL_BYTE_CHECK_ONLY" as "LOCAL_BYTE_CHECK_ONLY" | "STORAGE_BYTES_VERIFIED",
    immutableVersionConditionalRead: true,
    pin: jest.fn(async () => ({ objectKey: key, version: "generation-1" })),
    read: jest.fn(async () => ({ objectKey: key, version: "generation-1", conditionApplied: true, body: new ReadableStream<Uint8Array>({ start(c) { c.enqueue(bytes); c.close(); }, cancel }) })),
  };
  const options = { authorizeReservation: async (_id: string, _signal: AbortSignal) => reservation, storage, policy: { allowedMimeTypes: ["image/bmp"], maxBytes: 1000 }, signal: new AbortController().signal, limits: { timeoutMs: 100, maxReads: 100, maxChunks: 80, cleanupTimeoutMs: 10 } };
  return { options, reservation, storage, cancel };
}
test("fabricated provider assurance never elevates local byte checks", async () => {
  const { options, storage } = setup();
  storage.assurance = "STORAGE_BYTES_VERIFIED";
  await expect(verifyEvidenceStorageBytes(key, options)).resolves.toMatchObject({ state: "LOCAL_BYTE_CHECK_ONLY", linked: false });
});

test("reads reserved opaque key and computes actual bytes without claiming linkage", async () => {
  const { options, storage, reservation } = setup();
  const result = await verifyEvidenceStorageBytes(key, options);
  expect(result).toMatchObject({ state: "LOCAL_BYTE_CHECK_ONLY", linked: false, observedSize: 58, observedSha256: reservation.declaredSha256, observedMime: "image/bmp" });
  expect(storage.pin).toHaveBeenCalledWith({ objectKey: key }, expect.any(AbortSignal));
  expect(storage.read).toHaveBeenCalledWith({ objectKey: key, ifVersion: "generation-1" }, expect.any(AbortSignal));
});

test.each([0, 2, 53, 57])("rejects truncated image of %i bytes even with matching hash", async n => {
  const { options } = setup(image().subarray(0, n));
  await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow();
});
test.each([2, 6, 10, 14, 18, 22, 26, 28, 30, 34, 46, 50])("rejects malformed BMP field at %i", async offset => {
  const b = image(); b[offset] = b[offset]! ^ 1;
  await expect(verifyEvidenceStorageBytes(key, setup(b).options)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
});
test("rejects changed object hash", async () => {
  const { options, reservation } = setup(); reservation.declaredSha256 = "0".repeat(64);
  await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
});
test("rejects short object despite valid original declaration", async () => {
  const { options, reservation } = setup(); reservation.declaredSize++;
  await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
});
test("does not trust declared MIME", async () => {
  const { options, reservation } = setup(); reservation.declaredMime = "image/png";
  await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow("EVIDENCE_RESERVATION_INVALID");
});
test("aborts and cancels an oversized unfinished stream", async () => {
  const { options, storage } = setup(); const cancel = jest.fn();
  const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array(1001)); }, cancel });
  storage.read.mockResolvedValue({ objectKey: key, version: "generation-1", conditionApplied: true, body });
  await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
  expect(cancel).toHaveBeenCalledTimes(1);
  expect((storage.read.mock.calls[0] as unknown as [unknown, AbortSignal])[1].aborted).toBe(true);
});
test("rejects overwritten generation", async () => {
  const { options, storage } = setup(); const response = await storage.read();
  storage.read.mockResolvedValue({ ...response, version: "generation-2" });
  await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
});
test("rejects unconditioned read", async () => {
  const { options, storage } = setup(); const response = await storage.read();
  storage.read.mockResolvedValue({ ...response, conditionApplied: false });
  await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
});
test("adapter trust flags cannot confer provider assurance", async () => {
  const { options, storage } = setup(); storage.immutableVersionConditionalRead = false;
  await expect(verifyEvidenceStorageBytes(key, options)).resolves.toMatchObject({ state: "LOCAL_BYTE_CHECK_ONLY", linked: false });
});
test.each(["https://attacker.invalid/x", "../other", ""]) ("rejects nonopaque server key %s", async objectKey => {
  const { options, reservation, storage } = setup(); reservation.objectKey = objectKey;
  await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow("EVIDENCE_RESERVATION_INVALID");
  expect(storage.pin).not.toHaveBeenCalled();
});
test.each([0, -1, NaN, Infinity])("requires explicit positive bounded policy %s", async maxBytes => {
  const { options } = setup(); options.policy.maxBytes = maxBytes;
  await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow("EVIDENCE_POLICY_UNAVAILABLE");
});
test("sanitizes pin provider errors", async () => {
  const { options, storage } = setup(); storage.pin.mockRejectedValue(new Error("secret signed URL"));
  await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow(/^EVIDENCE_STORAGE_VERIFICATION_FAILED$/);
});
test("sanitizes stream read errors", async () => {
  const { options, storage } = setup();
  storage.read.mockResolvedValue({ objectKey: key, version: "generation-1", conditionApplied: true,
    body: new ReadableStream<Uint8Array>({ start(c) { c.error(new Error("secret")); } }) });
  await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow(/^EVIDENCE_STORAGE_VERIFICATION_FAILED$/);
});
test("empty Storage API object is never success", async () => {
  const { options, storage } = setup(); storage.read.mockResolvedValue({} as never);
  await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
});

test("hashes actual multi-chunk raster, independent of transport boundaries", async () => {
  const { options, storage } = setup(); const b = image();
  storage.read.mockResolvedValue({ objectKey: key, version: "generation-1", conditionApplied: true,
    body: new ReadableStream<Uint8Array>({ start(c) { for (const byte of b) c.enqueue(Uint8Array.of(byte)); c.close(); } }) });
  await expect(verifyEvidenceStorageBytes(key, options)).resolves.toMatchObject({ observedSize: b.length, state: "LOCAL_BYTE_CHECK_ONLY", linked: false });
});
test("rejects non-image bytes labeled as allowed MIME with correct size and hash", async () => {
  await expect(verifyEvidenceStorageBytes(key, setup(Buffer.alloc(58, 7)).options)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
});
test("rejects pin identity substitution", async () => {
  const { options, storage } = setup(); storage.pin.mockResolvedValue({ objectKey: "other", version: "generation-1" });
  await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
  expect(storage.read).not.toHaveBeenCalled();
});
describe("invalid reservation cleanup", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test.each([
    { id: "other" },
    { objectKey: "../other" },
    { actorProfileId: "" },
    { declaredSize: 0 },
    { declaredSize: 1001 },
    { declaredSha256: "invalid" },
    { declaredMime: "image/png" },
  ])("releases deadline and caller listener for invalid metadata %j", async invalid => {
    const { options, reservation, storage } = setup();
    Object.assign(reservation, invalid);
    const add = jest.spyOn(options.signal, "addEventListener");
    const remove = jest.spyOn(options.signal, "removeEventListener");

    await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow(/^EVIDENCE_RESERVATION_INVALID$/);

    expect(storage.pin).not.toHaveBeenCalled();
    expect(storage.read).not.toHaveBeenCalled();
    expect(add).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith("abort", add.mock.calls[0]![1]);
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe("caller-supplied lifetime budgets", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());
  test.each(["pin", "read", "body"])("bounds stalled %s", async stage => {
    const { options, storage } = setup();
    if (stage === "pin") storage.pin.mockImplementation(() => new Promise(() => {}));
    if (stage === "read") storage.read.mockImplementation(() => new Promise(() => {}));
    if (stage === "body") storage.read.mockResolvedValue({ objectKey: key, version: "generation-1", conditionApplied: true, body: new ReadableStream() });
    let error: unknown;
    const pending = verifyEvidenceStorageBytes(key, options).catch(e => { error = e; });
    await jest.advanceTimersByTimeAsync(111);
    expect(error).toEqual(new Error("EVIDENCE_STORAGE_VERIFICATION_FAILED"));
    await pending;
    expect(jest.getTimerCount()).toBe(0);
  });
  test("external abort bounds hanging cancellation and releases lock", async () => {
    const { options, storage } = setup();
    const controller = new AbortController(); options.signal = controller.signal;
    const cancel = jest.fn(() => new Promise<void>(() => {}));
    const body = new ReadableStream<Uint8Array>({ cancel });
    storage.read.mockResolvedValue({ objectKey: key, version: "generation-1", conditionApplied: true, body });
    let error: unknown;
    const pending = verifyEvidenceStorageBytes(key, options).catch(e => { error = e; });
    await jest.advanceTimersByTimeAsync(0);
    controller.abort();
    await jest.advanceTimersByTimeAsync(11);
    expect(error).toEqual(new Error("EVIDENCE_STORAGE_VERIFICATION_FAILED"));
    await pending;
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(body.locked).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });
});
test.each(["maxReads", "maxChunks"] as const)("bounds zero-chunk flood by %s", async budget => {
  const { options, storage } = setup(); options.limits[budget] = 3;
  let pulls = 0;
  const body = new ReadableStream<Uint8Array>({ pull(c) { pulls++; if (pulls > 10) c.close(); else c.enqueue(new Uint8Array()); } }, { highWaterMark: 0 });
  storage.read.mockResolvedValue({ objectKey: key, version: "generation-1", conditionApplied: true, body });
  await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
  expect(pulls).toBeLessThanOrEqual(4);
  expect(body.locked).toBe(false);
});
test.each(["timeoutMs", "maxReads", "maxChunks", "cleanupTimeoutMs"] as const)("validates explicit %s", async field => {
  const { options, storage } = setup(); options.limits[field] = 0;
  await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow("EVIDENCE_POLICY_UNAVAILABLE");
  expect(storage.pin).not.toHaveBeenCalled();
});

test("authorization denial never reaches storage", async () => {
  const { options, storage } = setup(); options.authorizeReservation = async () => { throw new Error("DENIED"); };
  await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow("DENIED");
  expect(storage.pin).not.toHaveBeenCalled();
});

// NEW TESTS FOR TDD - Authorization bounding and sanitization
describe("authorization bounding and sanitization", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("stalled authorization times out within overall deadline", async () => {
    const { options, storage } = setup();
    options.authorizeReservation = async () => new Promise(() => {}); // stalls forever
    let error: unknown;
    const pending = verifyEvidenceStorageBytes(key, options).catch((e: unknown) => { error = e; });
    await jest.advanceTimersByTimeAsync(111); // timeoutMs = 100
    expect(error).toEqual(new Error("EVIDENCE_STORAGE_VERIFICATION_FAILED"));
    await pending;
    expect(storage.pin).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test("authorization receives cancellation signal when caller aborts", async () => {
    const { options, storage } = setup();
    const controller = new AbortController();
    options.signal = controller.signal;
    let authAbortSignal: AbortSignal | undefined;
    options.authorizeReservation = async (_id: string, signal?: AbortSignal): Promise<VerifiedEvidenceReservation> => {
      authAbortSignal = signal;
      return new Promise(() => {});
    };
    let error: unknown;
    const pending = verifyEvidenceStorageBytes(key, options).catch((e: unknown) => { error = e; });
    await jest.advanceTimersByTimeAsync(0);
    controller.abort();
    await jest.advanceTimersByTimeAsync(11);
    expect(error).toEqual(new Error("EVIDENCE_STORAGE_VERIFICATION_FAILED"));
    await pending;
    expect(authAbortSignal).toBeDefined();
    expect(authAbortSignal?.aborted).toBe(true);
    expect(storage.pin).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test("raw secret-bearing authorization error is sanitized without logging secret", async () => {
    const { options, storage } = setup();
    const secretError = new Error("secret token abc123 in URL");
    options.authorizeReservation = async () => { throw secretError; };
    await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow(/^EVIDENCE_STORAGE_VERIFICATION_FAILED$/);
    expect(storage.pin).not.toHaveBeenCalled();
  });

  test("delayed authorization rejection does not cause unhandled rejection", async () => {
    const { options, storage } = setup();
    options.authorizeReservation = async () => {
      await new Promise(r => setTimeout(r, 10));
      throw new Error("delayed auth failure");
    };
    let error: unknown;
    const pending = verifyEvidenceStorageBytes(key, options).catch(e => { error = e; });
    await jest.advanceTimersByTimeAsync(111); // timeoutMs = 100
    expect(error).toEqual(new Error("EVIDENCE_STORAGE_VERIFICATION_FAILED"));
    await pending;
    expect(jest.getTimerCount()).toBe(0);
  });

  test("expired whole deadline before storage is not reset", async () => {
    const { options, storage } = setup();
    // Make storage slow so we can test deadline expiration during storage phase
    let pinResolve: (v: { objectKey: string; version: string }) => void;
    const pinPromise = new Promise<{ objectKey: string; version: string }>((resolve) => { pinResolve = resolve; });
    storage.pin.mockImplementation(() => pinPromise);
    let authResolve: (v: VerifiedEvidenceReservation) => void;
    const authPromise = new Promise<VerifiedEvidenceReservation>((resolve) => { authResolve = resolve; });
    options.authorizeReservation = async () => authPromise;
    let error: unknown;
    const pending = verifyEvidenceStorageBytes(key, options).catch((e: unknown) => { error = e; });
    // Advance past authorization delay but before overall timeout
    await jest.advanceTimersByTimeAsync(50);
    // Resolve authorization
    authResolve!({ id: key, objectKey: key, actorProfileId: "actor", staffId: "staff", stationId: "station", deviceId: "device", parentLocalId: "parent", parentKind: "rental_start", declaredMime: "image/bmp", declaredSize: 58, declaredSha256: createHash("sha256").update(image()).digest("hex") });
    // Advance some more but not past overall timeout yet
    await jest.advanceTimersByTimeAsync(40); // total 90ms
    // Now resolve pin - but overall timeout should fire before we can complete
    await jest.advanceTimersByTimeAsync(20); // total 110ms, past 100ms deadline
    expect(error).toEqual(new Error("EVIDENCE_STORAGE_VERIFICATION_FAILED"));
    await pending;
    expect(jest.getTimerCount()).toBe(0);
  });

  test("pre-abort prevents authorization and provider calls", async () => {
    const { options, storage } = setup();
    const controller = new AbortController();
    options.signal = controller.signal;
    const authMock = jest.fn(async () => ({ id: key, objectKey: key, actorProfileId: "actor", staffId: "staff", stationId: "station", deviceId: "device", parentLocalId: "parent", parentKind: "rental_start", declaredMime: "image/bmp", declaredSize: 58, declaredSha256: createHash("sha256").update(image()).digest("hex") }));
    options.authorizeReservation = authMock;
    controller.abort(); // pre-aborted
    await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
    expect(authMock).not.toHaveBeenCalled();
    expect(storage.pin).not.toHaveBeenCalled();
    expect(storage.read).not.toHaveBeenCalled();
  });

  test("explicit deny semantics propagate through (DENIED)", async () => {
    const { options, storage } = setup();
    options.authorizeReservation = async () => { throw new Error("DENIED"); };
    await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow("DENIED");
    expect(storage.pin).not.toHaveBeenCalled();
  });

  test("explicit deny semantics propagate through (FORBIDDEN)", async () => {
    const { options, storage } = setup();
    options.authorizeReservation = async () => { throw new Error("FORBIDDEN"); };
    await expect(verifyEvidenceStorageBytes(key, options)).rejects.toThrow("FORBIDDEN");
    expect(storage.pin).not.toHaveBeenCalled();
  });
});