jest.mock("next/server", () => ({
  NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, json: async () => body }) },
}));
jest.mock("../supabase/require-staff-tablet-access", () => ({ requireStaffTabletAccess: jest.fn() }));

import { requireStaffTabletAccess } from "../supabase/require-staff-tablet-access";
import type { TabletSyncEnvelope } from "@glide/shared";
import { requireStaffTabletQueryContext, requireStaffTabletSyncContext } from "./request-context";

function envelope(): TabletSyncEnvelope {
  return {
    clientBatchId: "batch", deviceId: "registered-tablet", stationId: "station", staffId: "staff",
    createdAtDevice: "2026-07-28T01:00:00Z", appVersion: "1", records: [{
      localId: "local", recordType: "rider_registration", occurredAtDevice: "2026-07-28T01:00:00Z",
      payload: { riderLocalId: "rider", name: "Rider", phone: "0123456789", userType: "local",
        pdpaConsent: { acceptedAtDevice: "2026-07-28T01:00:00Z", noticeVersion: "approved-version", method: "staff_tablet", staffId: "staff", stationId: "station" } },
      evidence: [], dependencies: [],
    }],
  };
}

test("sync derives staff from the verified context and keeps the device identifier distinct", async () => {
  const req = request("deviceId=ignored&stationId=ignored");
  const body = envelope();
  const result = await requireStaffTabletSyncContext(req, body);
  expect(guard).toHaveBeenCalledWith(req, { deviceId: "registered-tablet", stationId: "station" });
  expect(result).toEqual({ context, deviceIdentifier: "registered-tablet", envelope: body });
  expect("context" in result && result.context.staffId).toBe("staff");
});

test.each([
  ["envelope staff", { staffId: "forged" }],
  ["envelope staff missing", { staffId: undefined }],
  ["envelope station", { stationId: "other" }],
  ["envelope device missing", { deviceId: undefined }],
  ["envelope device malformed", { deviceId: {} }],
  ["records missing", { records: undefined }],
  ["record payload missing", { records: [{ localId: "x" }] }],
  ["consent staff", { records: [{ ...envelope().records[0], payload: { ...envelope().records[0]!.payload, pdpaConsent: { staffId: "forged", stationId: "station" } } }] }],
  ["consent station", { records: [{ ...envelope().records[0], payload: { ...envelope().records[0]!.payload, pdpaConsent: { staffId: "staff", stationId: "other" } } }] }],
  ["consent missing", { records: [{ ...envelope().records[0], payload: { riderLocalId: "rider" } }] }],
  ["nested override", { records: [{ ...envelope().records[0], payload: { ...envelope().records[0]!.payload, manualOverride: { staffId: "forged" } } }] }],
  ["nested return station", { records: [{ ...envelope().records[0], payload: { ...envelope().records[0]!.payload, returnStationId: "other" } }] }],
])("rejects untrusted sync identity: %s", async (_name, change) => {
  const result = await requireStaffTabletSyncContext(request(""), { ...envelope(), ...change } as unknown as TabletSyncEnvelope);
  expect("error" in result && result.error.status).toBeGreaterThanOrEqual(400);
});

test.each([null, [], "body", 1])("rejects non-object sync body %p before guard", async (body) => {
  const result = await requireStaffTabletSyncContext(request(""), body as unknown as TabletSyncEnvelope);
  expect("error" in result && result.error.status).toBe(400);
  expect(guard).not.toHaveBeenCalled();
});

test("sync guard denial cannot reach a privileged continuation", async () => {
  const denial = { error: { status: 401 } } as Awaited<ReturnType<typeof requireStaffTabletAccess>>;
  guard.mockResolvedValue(denial);
  const downstream = jest.fn();
  const result = await requireStaffTabletSyncContext(request(""), envelope());
  if (!("error" in result)) downstream(result.context);
  expect(result).toBe(denial);
  expect(downstream).not.toHaveBeenCalled();
});

test.each(["rental_start", "rental_return", "incident", "battery_log", "manual_override", "shift_closeout"] as const)(
  "%s requires its own staff identity, not just the envelope", async (recordType) => {
    const body = envelope();
    const record = body.records[0]!;
    const result = await requireStaffTabletSyncContext(request(""), { ...body, records: [{ ...record, recordType, payload: {} }] } as unknown as TabletSyncEnvelope);
    expect("error" in result && result.error.status).toBe(400);
  },
);

test.each(["rental_start", "incident", "battery_log", "shift_closeout"] as const)(
  "%s requires its own station identity", async (recordType) => {
    const body = envelope();
    const result = await requireStaffTabletSyncContext(request(""), { ...body, records: [{ ...body.records[0], recordType, payload: { staffId: "staff" } }] } as unknown as TabletSyncEnvelope);
    expect("error" in result && result.error.status).toBe(400);
  },
);

test("return requires a return station and embedded override requires staff", async () => {
  const body = envelope();
  for (const payload of [{ staffId: "staff" }, { staffId: "staff", returnStationId: "station", manualOverride: {} }]) {
    const result = await requireStaffTabletSyncContext(request(""), { ...body, records: [{ ...body.records[0], recordType: "rental_return", payload }] } as unknown as TabletSyncEnvelope);
    expect("error" in result && result.error.status).toBe(400);
  }
});

test("JSON-parsed 15000-level extra nesting returns a sanitized denial after authentication", async () => {
  const body = envelope();
  const extra = JSON.parse('{"next":'.repeat(15000) + '"private-marker"' + '}'.repeat(15000));
  const downstream = jest.fn();
  const result = await requireStaffTabletSyncContext(request(""), Object.assign(body, { extra }));
  if (!("error" in result)) downstream(result.context);
  expect(guard).toHaveBeenCalledTimes(1);
  expect("error" in result && result.error.status).toBe(400);
  expect("error" in result && await result.error.json()).toEqual({ message: "Invalid staff tablet request identity." });
  expect(downstream).not.toHaveBeenCalled();
});

test.each([63, 64, 65])("identity traversal depth boundary %i", async (depth) => {
  // extra starts at depth one; its primitive leaf is at the requested depth.
  const extra = JSON.parse('{"next":'.repeat(depth - 1) + 'null' + '}'.repeat(depth - 1));
  const downstream = jest.fn();
  const result = await requireStaffTabletSyncContext(request(""), Object.assign(envelope(), { extra }));
  if (!("error" in result)) downstream(result.context);
  expect("error" in result).toBe(depth > 64);
  expect(downstream).toHaveBeenCalledTimes(depth > 64 ? 0 : 1);
  if ("error" in result) expect(await result.error.json()).toEqual({ message: "Invalid staff tablet request identity." });
});

function countValues(value: unknown): number {
  return 1 + (value !== null && typeof value === "object"
    ? Object.values(value).reduce<number>((sum, entry) => sum + countValues(entry), 0) : 0);
}

test.each([9999, 10000, 10001])("wide identity traversal node boundary %i", async (nodes) => {
  const body = Object.assign(envelope(), { extra: [] as unknown[] });
  body.extra = Array(nodes - countValues(body)).fill(null);
  const downstream = jest.fn();
  const result = await requireStaffTabletSyncContext(request(""), body);
  if (!("error" in result)) downstream(result.context);
  expect("error" in result).toBe(nodes > 10000);
  expect(downstream).toHaveBeenCalledTimes(nodes > 10000 ? 0 : 1);
  if ("error" in result) expect(await result.error.json()).toEqual({ message: "Invalid staff tablet request identity." });
});

test.each([
  ["staffId", "staff"], ["stationId", "station"], ["returnStationId", "station"],
])("nested object/array %s remains bound to the verified identity", async (key, valid) => {
  for (const identity of [valid, "forged-private-marker"]) {
    const body = Object.assign(envelope(), { extra: [{ nested: [{ [key]: identity }] }] });
    const downstream = jest.fn();
    const result = await requireStaffTabletSyncContext(request(""), body);
    if (!("error" in result)) downstream(result.context);
    expect("error" in result).toBe(identity !== valid);
    expect(downstream).toHaveBeenCalledTimes(identity === valid ? 1 : 0);
    if ("error" in result) expect(await result.error.json()).toEqual({ message: "Invalid staff tablet request identity." });
  }
});

const guard = jest.mocked(requireStaffTabletAccess);
const context = {
  userId: "user", staffId: "staff", staffRole: "station_staff", staffStationId: "station",
  deviceId: "database-device-uuid", deviceStationId: "station", stationId: "station", isCrossStationAllowed: false,
};
function request(query: string): Request {
  return { url: `https://example.invalid/api/staff-tablet/bootstrap?${query}`, headers: { get: () => "untrusted-header" } } as unknown as Request;
}
beforeEach(() => { guard.mockReset(); guard.mockResolvedValue({ context }); });

test.each([
  "stationId=station", "deviceId=tablet", "deviceId=&stationId=station",
  "deviceId=tablet&stationId=%20station", "deviceId=%20tablet&stationId=station",
  "deviceId=tab%00let&stationId=station", "deviceId=tablet&stationId=",
  "deviceId=tablet&deviceId=tablet&stationId=station",
  "deviceId=tablet&stationId=station&stationId=other",
  "deviceId=tablet&stationId=station&since=a&since=b",
  "deviceId=tablet&stationId=station&since=",
])("rejects missing, malformed or ambiguous query identity: %s", async (query) => {
  const result = await requireStaffTabletQueryContext(request(query));
  expect("error" in result && result.error.status).toBe(400);
  expect(guard).not.toHaveBeenCalled();
});

test("status requires a cursor while bootstrap may omit it", async () => {
  const req = request("deviceId=tablet&stationId=station");
  expect("context" in await requireStaffTabletQueryContext(req)).toBe(true);
  guard.mockClear();
  const result = await requireStaffTabletQueryContext(req, { requireSince: true });
  expect("error" in result && result.error.status).toBe(400);
  expect(guard).not.toHaveBeenCalled();
});

test("guard denial returns unchanged and gates privileged continuation", async () => {
  const denial = { error: { status: 403 } } as Awaited<ReturnType<typeof requireStaffTabletAccess>>;
  guard.mockResolvedValue(denial);
  const downstream = jest.fn();
  const result = await requireStaffTabletQueryContext(request("deviceId=tablet&stationId=station"));
  if (!("error" in result)) downstream(result.context);
  expect(result).toBe(denial);
  expect(downstream).not.toHaveBeenCalled();
});

test("GET identity comes only from the approved query and preserves identifier versus database UUID", async () => {
  const req = request("deviceId=registered-tablet&stationId=station&since=cursor%3A1");
  const result = await requireStaffTabletQueryContext(req);
  expect(guard).toHaveBeenCalledWith(req, { deviceId: "registered-tablet", stationId: "station" });
  expect(result).toEqual({ context, deviceIdentifier: "registered-tablet", since: "cursor:1" });
});
