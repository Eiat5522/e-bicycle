/** @jest-environment node */
// Keep route, query adapter, access guard and snapshot service real. Only the
// external auth/database boundaries are replaced; never contact Supabase here.
jest.mock("@/lib/supabase/admin", () => ({ createAdminClient: jest.fn() }));
jest.mock("@/lib/supabase/require-admin", () => ({ createAuthenticatedClient: jest.fn() }));

import { GET } from "./route";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthenticatedClient } from "@/lib/supabase/require-admin";

const admin = jest.mocked(createAdminClient);
const authenticated = jest.mocked(createAuthenticatedClient);
const staff = { id: "private-staff", role: "station_staff", station_id: "station", status: "active" };
const device = { id: "private-device", station_id: "station", device_status: "active" };
let staffResult: { data: typeof staff | null; error: unknown };
let deviceResult: { data: typeof device | null; error: unknown };
let from: jest.Mock;
let getUser: jest.Mock;

function request(query = "deviceId=wire-device&stationId=station", bearer = true) {
  return new Request(`https://example.invalid/api/staff-tablet/bootstrap?${query}`, {
    headers: bearer ? { Authorization: "Bearer test-token" } : {},
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  staffResult = { data: { ...staff }, error: null };
  deviceResult = { data: { ...device }, error: null };
  getUser = jest.fn().mockResolvedValue({ data: { user: { id: "private-user" } }, error: null });
  authenticated.mockImplementation((req) => {
    if (!req.headers.get("Authorization")) throw new Error("Missing Bearer");
    return { auth: { getUser } } as unknown as ReturnType<typeof createAuthenticatedClient>;
  });
  from = jest.fn((table: string) => {
    if (!["staff_profiles", "tablet_devices"].includes(table)) throw new Error(`Unexpected snapshot read: ${table}`);
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn(async () => table === "staff_profiles" ? staffResult : deviceResult),
    };
    return chain;
  });
  admin.mockReturnValue({ from } as unknown as ReturnType<typeof createAdminClient>);
});

async function expectResponse(req: Request, status: number, message: string, tables: string[]) {
  const response = await GET(req);
  expect(response.status).toBe(status);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ message });
  // The only privileged client is the guard's own lookup client. The real
  // snapshot service must never construct a second client or read any dataset.
  expect(admin).toHaveBeenCalledTimes(tables.length ? 1 : 0);
  expect(from.mock.calls.map(([table]) => table)).toEqual(tables);
  expect(JSON.stringify([...response.headers])).not.toMatch(/private-user|private-staff|private-device/);
}

test("missing Bearer stops before guard database construction", async () => {
  await expectResponse(request(undefined, false), 401, "Authentication is required.", []);
});

test.each(["error", "throw", "missing-user"])("auth %s stops before guard database construction", async (failure) => {
  if (failure === "throw") getUser.mockRejectedValue(new Error("secret auth details"));
  else getUser.mockResolvedValue({ data: { user: failure === "missing-user" ? null : { id: "private-user" } }, error: failure === "error" ? new Error("secret") : null });
  await expectResponse(request(), 401, "Authentication is required.", []);
});

test.each(["non-staff", "inactive-staff", "staff-query-error", "configuration-error", "disabled", "lost", "inactive-device", "unregistered", "device-query-error", "null-staff-station", "null-device-station", "ordinary-mismatch", "elevated-selection-mismatch"])("real guard denial: %s", async (scenario) => {
  let status = 403;
  let message = "An active staff profile is required.";
  let tables = ["staff_profiles", "tablet_devices"];
  let req = request();
  switch (scenario) {
    case "non-staff": staffResult.data = null; tables = ["staff_profiles"]; break;
    case "inactive-staff": staffResult.data!.status = "inactive"; tables = ["staff_profiles"]; break;
    case "staff-query-error": staffResult.error = new Error("secret database details"); status = 500; message = "Unable to verify staff access."; tables = ["staff_profiles"]; break;
    case "configuration-error": admin.mockImplementation(() => { throw new Error("secret configuration"); }); status = 500; message = "Unable to verify staff tablet access."; tables = []; break;
    case "disabled": deviceResult.data!.device_status = "disabled"; message = "Device is disabled."; break;
    case "lost": deviceResult.data!.device_status = "lost"; message = "Device has been reported lost."; break;
    case "inactive-device": deviceResult.data!.device_status = "pending"; message = "An active device is required."; break;
    case "unregistered": deviceResult.data = null; message = "Device is not registered."; break;
    case "device-query-error": deviceResult.error = new Error("secret database details"); status = 500; message = "Unable to verify device access."; break;
    case "null-staff-station": staffResult.data!.station_id = null as unknown as string; message = "A valid station assignment is required."; break;
    case "null-device-station": deviceResult.data!.station_id = null as unknown as string; message = "A valid station assignment is required."; break;
    case "ordinary-mismatch": staffResult.data!.station_id = "other"; message = "Staff member is not assigned to this station."; break;
    case "elevated-selection-mismatch": staffResult.data!.role = "operations_manager"; req = request("deviceId=wire-device&stationId=other"); message = "A valid station assignment is required."; break;
  }
  if (scenario === "configuration-error") {
    const response = await GET(req);
    expect(response.status).toBe(status);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ message });
    expect(admin).toHaveBeenCalledTimes(1);
    expect(from).not.toHaveBeenCalled();
  } else await expectResponse(req, status, message, tables);
});

test.each(["", "deviceId=x", "stationId=station", "deviceId=x&deviceId=y&stationId=station", "deviceId=x&stationId=station&stationId=other", "deviceId=x&stationId=station&since=a&since=b", "deviceId=%20x&stationId=station", "deviceId=x&stationId=station&since="])("malformed query stops before auth: %s", async (query) => {
  await expectResponse(request(query), 400, "Invalid staff tablet request identity.", []);
  expect(authenticated).not.toHaveBeenCalled();
});

test.each(["station_staff", "operations_manager"])("authorized %s still receives bounded 503 without snapshot reads", async (role) => {
  staffResult.data!.role = role;
  if (role === "operations_manager") staffResult.data!.station_id = "other";
  const response = await GET(request());
  expect(response.status).toBe(503);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ code: "BOOTSTRAP_CONFIGURATION_UNAVAILABLE", message: "Approved notice versions and offline access policy are unavailable." });
  expect(admin).toHaveBeenCalledTimes(1);
  expect(from.mock.calls.map(([table]) => table)).toEqual(["staff_profiles", "tablet_devices"]);
});
