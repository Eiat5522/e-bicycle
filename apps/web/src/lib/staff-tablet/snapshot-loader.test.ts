jest.mock("../supabase/admin", () => ({ createAdminClient: jest.fn() }));
import { loadScopedCanonicalSnapshot, loadStaffTabletSnapshot, projectStaffRole } from "./snapshot-loader";
import type { StaffTabletAuthContext } from "../supabase/require-staff-tablet-access";

const context: StaffTabletAuthContext = { userId: "user", staffId: "staff", staffRole: "station_staff", staffStationId: "station", deviceId: "db-device", deviceStationId: "station", stationId: null, isCrossStationAllowed: false };

test("missing approved notice/offline configuration fails closed before privileged reads", async () => {
  const createClient = jest.fn();
  await expect(loadStaffTabletSnapshot(context, "wire-device", { createClient })).rejects.toMatchObject({ code: "BOOTSTRAP_CONFIGURATION_UNAVAILABLE" });
  expect(createClient).not.toHaveBeenCalled();
});

function fixture() {
  const rows: Record<string, unknown> = {
    stations: { id: "station", station_name: "Station", operating_status: "active" },
    staff_profiles: { id: "staff", profile_id: "user", staff_name: "Staff", role: "station_staff", station_id: "station", status: "active" },
    tablet_devices: { id: "db-device", device_identifier: "wire-device", device_status: "active", station_id: "station" },
    bikes: [{ id: "bike", station_id: "station", model: "Model", status: "ready_to_rent", battery_status: "normal", last_reported_at: "2026-01-01T00:00:00Z", active_rider_id: null, active_ride_started_at: null }],
  };
  const filters: Array<[string, string, unknown]> = [];
  const from = jest.fn((table: string) => {
    type Query = { select: jest.Mock; eq: jest.Mock; maybeSingle: () => Promise<{ data: unknown; error: null }>; then: (resolve: (value: unknown) => unknown) => Promise<unknown> };
    const query: Query = {
      select: jest.fn(() => query),
      eq: jest.fn((key: string, value: unknown) => { filters.push([table, key, value]); return query; }),
      maybeSingle: async () => ({ data: rows[table], error: null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows[table], error: null }).then(resolve),
    };
    return query;
  });
  return { rows, filters, from, client: { from } as unknown as ReturnType<typeof import("../supabase/admin").createAdminClient> };
}

test("canonical reads use the validated device station even when guard selection is omitted", async () => {
  const f = fixture();
  const snapshot = await loadScopedCanonicalSnapshot(context, "wire-device", f.client);
  expect(snapshot.bikes).toEqual([{ vehicleId: "bike", model: "Model", productStatus: "ready_to_rent", serverStatus: "ready_to_rent", stationId: "station", batteryStatus: "normal", lastKnownAtServer: "2026-01-01T00:00:00Z" }]);
  expect(snapshot.staff).toEqual({ staffId: "staff", name: "Staff", role: "station_staff", stationIds: ["station"] });
  expect(f.filters).toEqual(expect.arrayContaining([["stations", "id", "station"], ["bikes", "station_id", "station"], ["staff_profiles", "id", "staff"], ["staff_profiles", "profile_id", "user"], ["tablet_devices", "id", "db-device"], ["tablet_devices", "device_identifier", "wire-device"], ["tablet_devices", "station_id", "station"]]));
});

test.each([null, "other"])("invalid selected station %s fails before reads", async (stationId) => {
  const f = fixture();
  await expect(loadScopedCanonicalSnapshot({ ...context, stationId, deviceStationId: stationId === null ? null : "station" }, "wire-device", f.client)).rejects.toMatchObject({ code: "BOOTSTRAP_SCOPE_UNAVAILABLE" });
  expect(f.from).not.toHaveBeenCalled();
});

test("foreign bike rows fail closed even if a privileged query unexpectedly returns them", async () => {
  const f = fixture();
  f.rows.bikes = [{ ...(f.rows.bikes as object[])[0], station_id: "foreign" }];
  await expect(loadScopedCanonicalSnapshot(context, "wire-device", f.client)).rejects.toMatchObject({ code: "BOOTSTRAP_SCOPE_UNAVAILABLE" });
});

test("canonical read errors do not expose database details", async () => {
  const f = fixture();
  f.from.mockImplementation(() => { throw new Error("private sql details"); });
  await expect(loadScopedCanonicalSnapshot(context, "wire-device", f.client)).rejects.toThrow("Unable to read the station snapshot.");
});

test("active ride markers remain canonical markers rather than invented rentals", async () => {
  const f = fixture();
  f.rows.bikes = [{ ...(f.rows.bikes as object[])[0], active_rider_id: "rider", active_ride_started_at: "2026-01-01T00:00:00.123456Z" }];
  const result = await loadScopedCanonicalSnapshot(context, "wire-device", f.client);
  expect(result.activeRideMarkers).toHaveLength(1);
  expect(result.activeRideMarkers[0]?.active_ride_started_at).toBe("2026-01-01T00:00:00.123456Z");
  expect(result).not.toHaveProperty("activeRentals");
});

test.each(["stations", "staff_profiles", "tablet_devices", "bikes"])("returned query error from %s is sanitized", async (table) => {
  const f = fixture();
  const original = f.from.getMockImplementation()!;
  f.from.mockImplementation((name: string) => {
    const query = original(name);
    if (name === table) {
      query.maybeSingle = async () => ({ data: null, error: { message: "private database error" } }) as never;
      query.then = (resolve) => Promise.resolve({ data: null, error: { message: "private database error" } }).then(resolve);
    }
    return query;
  });
  await expect(loadScopedCanonicalSnapshot(context, "wire-device", f.client)).rejects.toThrow("Unable to read the station snapshot.");
});

test.each(["stations", "staff_profiles", "tablet_devices"])("changed %s identity fails closed on readback", async (table) => {
  const f = fixture();
  f.rows[table] = { ...(f.rows[table] as object), id: "foreign" };
  await expect(loadScopedCanonicalSnapshot(context, "wire-device", f.client)).rejects.toMatchObject({ code: "BOOTSTRAP_SCOPE_UNAVAILABLE" });
});

test.each([["station_staff", "station_staff"], ["station_manager", "station_manager"], ["admin", "admin"]])("projects role %s without adding authority", (role, expected) => {
  expect(projectStaffRole(role)).toBe(expected);
});

test.each(["operations_manager", "assistant_operations_manager", "maintenance", "unknown"])("unrepresentable role %s fails instead of promoting to admin", (role) => {
  expect(() => projectStaffRole(role)).toThrow("cannot be represented");
});

test.each(["available", "maintenance"])("mixed canonical/legacy %s station inventory blocks the entire snapshot (policy unresolved)", async status => {
  const f = fixture();
  const canonical = (f.rows.bikes as object[])[0];
  f.rows.bikes = [canonical, { ...canonical, id: "legacy", status }];
  await expect(loadScopedCanonicalSnapshot(context, "wire-device", f.client)).rejects.toMatchObject({ code: "BOOTSTRAP_STATUS_UNSUPPORTED" });
  await expect(loadStaffTabletSnapshot(context, "wire-device", { createClient: () => f.client })).rejects.toMatchObject({ code: "BOOTSTRAP_CONFIGURATION_UNAVAILABLE" });
});

test.each(["available", "maintenance"])("legacy %s is not asserted to be a canonical tablet status", async status => {
  const f = fixture();
  f.rows.bikes = [{ ...(f.rows.bikes as object[])[0], status }];
  await expect(loadScopedCanonicalSnapshot(context, "wire-device", f.client)).rejects.toMatchObject({ code: "BOOTSTRAP_STATUS_UNSUPPORTED" });
});
