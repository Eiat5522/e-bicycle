/** @jest-environment node */
import { createHash } from "node:crypto";
import sharp from "sharp";
import { operationalEvidenceWorkflow } from "./evidence-workflow";
import type { StaffTabletAuthContext } from "../supabase/require-staff-tablet-access";

const mockQuery = jest.fn();
const mockRelease = jest.fn();
const mockDownload = jest.fn();
const mockSign = jest.fn();
jest.mock("pg", () => ({ Pool: jest.fn(() => ({ on: jest.fn(), connect: async () => ({ query: mockQuery, release: mockRelease }) })) }));
jest.mock("./evidence-storage", () => ({ OperationalEvidenceStorage: jest.fn(() => ({ download: mockDownload, issueSignedUpload: mockSign })) }));

const id = "11111111-1111-4111-8111-111111111111";
const context = { userId: id, staffId: id, deviceId: id, stationId: id } as StaffTabletAuthContext;
const payload = { uploadedAtDevice: "2026-01-01T00:00:00Z", evidenceLocalId: "file" };
const env = { API08_EVIDENCE_MODE: "OPERATIONAL_DATABASE_SNAPSHOT_V1", API08_DATABASE_URL: "postgresql://evidence_login@invalid/db", API08_DATABASE_CA: "synthetic", API08_STORAGE_ORIGIN: "https://invalid", API08_STORAGE_BUCKET: "staging", API08_STORAGE_SERVICE_KEY: "synthetic" };
let bytes: Buffer;
let reservation: Record<string, unknown>;
let receipt: Record<string, unknown> | null;
let denial: string | undefined;
let completeBytes: Buffer | undefined;
let events: string[];
const attachment = { attachmentId: "durable-attachment", uploadedAtDevice: payload.uploadedAtDevice };

beforeEach(async () => {
  jest.clearAllMocks();
  bytes = await sharp({ create: { width: 1, height: 1, channels: 3, background: "red" } }).png().toBuffer();
  reservation = { id: "reservation", object_key: "reserved-key", declared_mime: "image/png", declared_size: bytes.length, declared_sha256: createHash("sha256").update(bytes).digest("hex") };
  receipt = null; denial = undefined; completeBytes = undefined; events = [];
  mockDownload.mockImplementation(async () => { events.push("download"); return bytes; });
  mockSign.mockImplementation(async () => { events.push("sign"); return { uploadUrl: "synthetic" }; });
  mockQuery.mockImplementation(async (sql: string, values?: unknown[]) => {
    if (sql.includes("station_evidence_operate")) {
      const operation = values![0] as string;
      events.push(operation);
      if (denial && (operation === "authorize" || operation === "init")) throw Object.assign(new Error("private sql"), { code: denial });
      if (operation === "complete") completeBytes = Buffer.from(values![5] as Buffer);
      return { rows: [{ result: operation === "receipt" ? receipt : operation === "complete" ? attachment : reservation }] };
    }
    if (sql.includes(" as safe")) return { rows: [{ safe: true }] };
    events.push(sql === "begin" || sql === "commit" || sql === "rollback" ? sql : "actor");
    return { rows: [] };
  });
});
function workflow() { return operationalEvidenceWorkflow(env)!; }
function complete() { return workflow().complete(context, payload, new AbortController().signal); }

test("real workflow binds actor transactions and validates original bytes before durable linkage", async () => {
  const original = Buffer.from(bytes);
  await expect(complete()).resolves.toEqual(attachment);
  expect(events).toEqual(["begin", "actor", "authorize", "commit", "begin", "actor", "receipt", "commit", "download", "begin", "actor", "complete", "commit"]);
  expect(completeBytes).toEqual(original);
  expect(bytes.every(b => b === 0)).toBe(true);
  expect(mockRelease.mock.calls).toEqual([[false], [false], [false]]);
});
test("parent SQL denial rolls back before receipt/download/link", async () => {
  denial = "42501";
  await expect(complete()).rejects.toThrow("DENIED");
  expect(events).toEqual(["begin", "actor", "authorize", "rollback"]);
  expect(mockDownload).not.toHaveBeenCalled();
  expect(completeBytes).toBeUndefined();
});
test("init reservation collision uses real owner SQLSTATE mapping before issuing upload", async () => {
  denial = "23505";
  await expect(workflow().init(context, { ...payload, declaredSha256: "changed" }, new AbortController().signal)).rejects.toThrow("EVIDENCE_COMPLETION_CONFLICT");
  expect(events).toEqual(["begin", "actor", "init", "rollback"]);
  expect(mockSign).not.toHaveBeenCalled();
});
test("exact immutable receipt replays its identity without download or new linkage", async () => {
  receipt = attachment;
  await expect(complete()).resolves.toBe(attachment);
  expect(events.filter(e => ["authorize", "receipt", "complete", "download"].includes(e))).toEqual(["authorize", "receipt"]);
  expect(mockDownload).not.toHaveBeenCalled();
});
test("receipt timestamp conflict rejects without download or linkage", async () => {
  receipt = { ...attachment, uploadedAtDevice: "2026-01-02T00:00:00Z" };
  await expect(complete()).rejects.toThrow("EVIDENCE_COMPLETION_CONFLICT");
  expect(mockDownload).not.toHaveBeenCalled();
  expect(completeBytes).toBeUndefined();
});
test.each(["size", "hash", "replacement", "malformed"])("real %s mismatch cannot link and clears downloaded bytes", async kind => {
  if (kind === "size") reservation.declared_size = bytes.length + 1;
  if (kind === "hash") reservation.declared_sha256 = "0".repeat(64);
  if (kind === "replacement") bytes = await sharp({ create: { width: 1, height: 1, channels: 3, background: "blue" } }).png().toBuffer();
  if (kind === "malformed") {
    bytes = Buffer.from("not an image");
    reservation.declared_size = bytes.length;
    reservation.declared_sha256 = createHash("sha256").update(bytes).digest("hex");
  }
  await expect(complete()).rejects.toThrow("EVIDENCE_STORAGE_VERIFICATION_FAILED");
  expect(events).not.toContain("complete");
  expect(completeBytes).toBeUndefined();
  expect(bytes.every(b => b === 0)).toBe(true);
});
