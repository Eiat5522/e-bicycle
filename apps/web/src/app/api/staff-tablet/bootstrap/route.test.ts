/** @jest-environment node */
import { NextResponse } from "next/server";
jest.mock("@/lib/supabase/require-staff-tablet-access", () => ({ requireStaffTabletAccess: jest.fn() }));
jest.mock("@/lib/staff-tablet/snapshot-loader", () => {
  const actual = jest.requireActual("@/lib/staff-tablet/snapshot-loader");
  return { ...actual, loadStaffTabletSnapshot: jest.fn() };
});
jest.mock("@/lib/supabase/admin", () => ({ createAdminClient: jest.fn() }));
import { GET } from "./route";
import { requireStaffTabletAccess } from "@/lib/supabase/require-staff-tablet-access";
import { BootstrapUnavailableError, loadStaffTabletSnapshot } from "@/lib/staff-tablet/snapshot-loader";
const guard = jest.mocked(requireStaffTabletAccess);
const loader = jest.mocked(loadStaffTabletSnapshot);
const context = { userId: "user", staffId: "staff", staffRole: "station_admin", staffStationId: "station", deviceId: "db-device", deviceStationId: "station", stationId: "station", isCrossStationAllowed: false };
const request = (query = "deviceId=wire-device&stationId=station") => ({ url: `https://example.invalid/api/staff-tablet/bootstrap?${query}` }) as Request;
beforeEach(() => { jest.resetAllMocks(); guard.mockResolvedValue({ context }); });
test.each([401, 403, 500])("guard denial %i performs no snapshot reads", async (status) => {
  const error = NextResponse.json({ message: "Denied." }, { status, headers: { "X-Test": "preserved" } });
  guard.mockResolvedValue({ error });
  const response = await GET(request());
  expect(response.status).toBe(status);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(response.headers.get("X-Test")).toBe("preserved");
  expect(await response.json()).toEqual({ message: "Denied." });
  expect(error.headers.has("Cache-Control")).toBe(false);
  expect(error.bodyUsed).toBe(false);
  expect(loader).not.toHaveBeenCalled();
});
test.each(["deviceId=x", "stationId=x", "deviceId=x&stationId=s&stationId=s", "deviceId=x&deviceId=y&stationId=s", "deviceId=x&stationId=s&since=a&since=b", "deviceId=%20x&stationId=s", "deviceId=x&stationId=s&since="])("malformed/duplicate query %s never reaches guard or loader", async (query) => {
  const response = await GET(request(query));
  expect(response.status).toBe(400);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(guard).not.toHaveBeenCalled(); expect(loader).not.toHaveBeenCalled();
});
test("passes verified context and wire identifier, not database device UUID, to real loader boundary", async () => {
  loader.mockRejectedValue(new BootstrapUnavailableError("BOOTSTRAP_CONFIGURATION_UNAVAILABLE", "Approved configuration is unavailable."));
  const response = await GET(request("deviceId=wire-device&stationId=station&since=cursor:1"));
  expect(loader).toHaveBeenCalledWith(context, "wire-device");
  expect(response.status).toBe(503);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ code: "BOOTSTRAP_CONFIGURATION_UNAVAILABLE", message: "Approved configuration is unavailable." });
});
test("route is wired to the actual fail-closed service when configuration is absent", async () => {
  const actual: typeof import("@/lib/staff-tablet/snapshot-loader") = jest.requireActual("@/lib/staff-tablet/snapshot-loader");
  loader.mockImplementation(actual.loadStaffTabletSnapshot);
  const response = await GET(request());
  expect(response.status).toBe(503);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ code: "BOOTSTRAP_CONFIGURATION_UNAVAILABLE", message: "Approved notice versions and offline access policy are unavailable." });
});

test("successful loader boundary is private and uncached (unit fixture only)", async () => {
  // Production deliberately cannot return this branch yet; this fixture tests
  // transport headers only, not bootstrap completeness or canonical mappings.
  const fixture = {} as Awaited<ReturnType<typeof loadStaffTabletSnapshot>>;
  loader.mockResolvedValue(fixture);
  const response = await GET(request());
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual(fixture);
});

test("unexpected query errors are sanitized", async () => {
  loader.mockRejectedValue(new Error("secret database details"));
  const response = await GET(request());
  expect(response.status).toBe(500);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual({ message: "Unable to load staff tablet bootstrap." });
});
