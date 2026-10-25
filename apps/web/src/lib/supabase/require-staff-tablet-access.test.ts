const mockAuthGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      json: async () => body,
      status: init?.status ?? 200,
    }),
  },
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockAuthGetUser,
    },
  })),
}));

jest.mock("./admin", () => ({
  createAdminClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

jest.mock("./config", () => ({
  getSupabaseConfig: jest.fn(() => ({
    supabasePublishableKey: "publishable-key",
    supabaseUrl: "https://example.supabase.co",
  })),
}));

import { createAdminClient } from "./admin";
import { getSupabaseConfig } from "./config";
import { requireStaffTabletAccess } from "./require-staff-tablet-access";

function buildRequest(hasAuth = true): Request {
  return {
    headers: {
      get: (name: string) =>
        hasAuth && name.toLowerCase() === "authorization" ? "Bearer test-token" : null,
    },
  } as unknown as Request;
}

type StaffRow = { id: string; role: string; station_id: string | null; status: string };
type DeviceRow = { id: string; device_status: string; station_id: string | null };

function mockSupabaseTables(staff: StaffRow | null, device: DeviceRow | null) {
  mockFrom.mockImplementation((table: string) => {
    if (table === "staff_profiles") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: staff, error: null }),
          }),
        }),
      };
    }

    if (table === "tablet_devices") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: device, error: null }),
          }),
        }),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });
}

describe("requireStaffTabletAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  it.each(["auth", "admin", "staff", "device", "config"])("sanitizes %s exceptions", async (stage) => {
    const sensitive = new Error("private database URL and secret");
    mockSupabaseTables(
      { id: "staff-1", role: "station_admin", station_id: "station-1", status: "active" },
      { id: "device-1", device_status: "active", station_id: "station-1" },
    );
    if (stage === "auth") mockAuthGetUser.mockRejectedValueOnce(sensitive);
    if (stage === "admin") jest.mocked(createAdminClient).mockImplementationOnce(() => { throw sensitive; });
    if (stage === "config") jest.mocked(getSupabaseConfig).mockImplementationOnce(() => { throw sensitive; });
    if (stage === "staff") mockFrom.mockImplementationOnce(() => { throw sensitive; });
    if (stage === "device") {
      const original = mockFrom.getMockImplementation()!;
      mockFrom.mockImplementation((table) => {
        if (table === "tablet_devices") return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.reject(sensitive) }) }) };
        return original(table);
      });
    }
    const result = await requireStaffTabletAccess(buildRequest(), { deviceId: "device-1" });
    expect(result).toEqual({ error: expect.objectContaining({ status: stage === "auth" || stage === "config" ? 401 : 500 }) });
    if ("error" in result) expect(JSON.stringify(await result.error.json())).not.toContain("private");
  });

  it.each(["", null, undefined])("rejects missing authenticated identity %s", async (id) => {
    mockAuthGetUser.mockResolvedValueOnce({ data: { user: { id } }, error: null });
    mockSupabaseTables(
      { id: "staff-1", role: "station_admin", station_id: "station-1", status: "active" },
      { id: "device-1", device_status: "active", station_id: "station-1" },
    );
    expect(await requireStaffTabletAccess(buildRequest(), { deviceId: "device-1" }))
      .toEqual({ error: expect.objectContaining({ status: 401 }) });
  });

  it.each(["staff", "device", "identifier"])("rejects missing %s identity", async (kind) => {
    mockSupabaseTables(
      { id: kind === "staff" ? "" : "staff-1", role: "station_admin", station_id: "station-1", status: "active" },
      { id: kind === "device" ? "" : "device-1", device_status: "active", station_id: "station-1" },
    );
    expect(await requireStaffTabletAccess(buildRequest(), { deviceId: kind === "identifier" ? " " : "device-1" }))
      .toEqual({ error: expect.objectContaining({ status: 403 }) });
  });

  it.each(["inactive", "disabled", "unknown", "", null, undefined])("rejects non-active staff status %s", async (status) => {
    mockSupabaseTables(
      { id: "staff-1", role: "station_admin", station_id: "station-1", status: status as string },
      { id: "device-1", device_status: "active", station_id: "station-1" },
    );
    expect(await requireStaffTabletAccess(buildRequest(), { deviceId: "device-1" }))
      .toEqual({ error: expect.objectContaining({ status: 403 }) });
  });

  it.each(["staff", "device"])("sanitizes returned %s query errors", async (tableKind) => {
    mockSupabaseTables(
      { id: "staff-1", role: "station_admin", station_id: "station-1", status: "active" },
      { id: "device-1", device_status: "active", station_id: "station-1" },
    );
    const original = mockFrom.getMockImplementation()!;
    mockFrom.mockImplementation((table) => table === (tableKind === "staff" ? "staff_profiles" : "tablet_devices")
      ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: "sensitive database error" } }) }) }) }
      : original(table));
    const result = await requireStaffTabletAccess(buildRequest(), { deviceId: "device-1" });
    expect(result).toEqual({ error: expect.objectContaining({ status: 500 }) });
    if ("error" in result) expect(await result.error.json()).toEqual({ message: `Unable to verify ${tableKind} access.` });
  });

  it("rejects requests without a Bearer token", async () => {
    const result = await requireStaffTabletAccess(buildRequest(false), {
      deviceId: "device-1",
      stationId: "station-1",
    });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(401);
    }
  });

  it("rejects requests when the Supabase session is invalid", async () => {
    mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid" } });

    const result = await requireStaffTabletAccess(buildRequest(), {
      deviceId: "device-1",
      stationId: "station-1",
    });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(401);
    }
  });

  it("rejects authenticated users who are not staff", async () => {
    mockSupabaseTables(null, null);

    const result = await requireStaffTabletAccess(buildRequest(), {
      deviceId: "device-1",
      stationId: "station-1",
    });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(403);
    }
  });

  it("rejects staff assigned to a different station", async () => {
    mockSupabaseTables(
      { id: "staff-1", role: "station_admin", station_id: "station-2", status: "active" },
      { id: "device-1", device_status: "active", station_id: "station-1" },
    );

    const result = await requireStaffTabletAccess(buildRequest(), {
      deviceId: "device-1",
      stationId: "station-1",
    });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(403);
    }
  });

  it.each(["pending", "unknown", "", null, undefined])("rejects non-active device status %s", async (status) => {
    mockSupabaseTables(
      { id: "staff-1", role: "station_admin", station_id: "station-1", status: "active" },
      { id: "device-1", device_status: status as string, station_id: "station-1" },
    );
    const result = await requireStaffTabletAccess(buildRequest(), { deviceId: "device-1" });
    expect(result).toEqual({ error: expect.objectContaining({ status: 403 }) });
  });

  it("rejects disabled devices", async () => {
    mockSupabaseTables(
      { id: "staff-1", role: "station_admin", station_id: "station-1", status: "active" },
      { id: "device-1", device_status: "disabled", station_id: "station-1" },
    );

    const result = await requireStaffTabletAccess(buildRequest(), {
      deviceId: "device-1",
      stationId: "station-1",
    });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(403);
    }
  });

  it("rejects lost devices", async () => {
    mockSupabaseTables(
      { id: "staff-1", role: "station_admin", station_id: "station-1", status: "active" },
      { id: "device-1", device_status: "lost", station_id: "station-1" },
    );

    const result = await requireStaffTabletAccess(buildRequest(), {
      deviceId: "device-1",
      stationId: "station-1",
    });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.status).toBe(403);
    }
  });

  it.each([
    ["station_admin", null, null, undefined],
    ["station_admin", "station-1", null, "station-1"],
    ["operations_manager", null, "station-1", "station-1"],
    ["operations_manager", "station-9", null, "station-1"],
    ["operations_manager", "station-9", "station-1", "station-2"],
    ["station_admin", "station-1", "station-1", ""],
  ])("rejects invalid station relations (%s, %s, %s, %s)", async (role, staffStation, deviceStation, stationId) => {
    mockSupabaseTables(
      { id: "staff-1", role: role!, station_id: staffStation ?? null, status: "active" },
      { id: "device-1", device_status: "active", station_id: deviceStation ?? null },
    );
    const result = await requireStaffTabletAccess(buildRequest(), { deviceId: "device-1", ...(stationId === undefined ? {} : { stationId }) });
    expect(result).toEqual({ error: expect.objectContaining({ status: 403 }) });
  });

  it("accepts valid staff/device/station combinations", async () => {
    mockSupabaseTables(
      { id: "staff-1", role: "station_admin", station_id: "station-1", status: "active" },
      { id: "device-1", device_status: "active", station_id: "station-1" },
    );

    const result = await requireStaffTabletAccess(buildRequest(), {
      deviceId: "device-1",
      stationId: "station-1",
    });

    expect("context" in result).toBe(true);
    if ("context" in result) {
      expect(result.context.staffId).toBe("staff-1");
      expect(result.context.isCrossStationAllowed).toBe(false);
    }
  });

  it("permits manager/admin roles to access a different station", async () => {
    mockSupabaseTables(
      { id: "staff-2", role: "operations_manager", station_id: "station-9", status: "active" },
      { id: "device-1", device_status: "active", station_id: "station-1" },
    );

    const result = await requireStaffTabletAccess(buildRequest(), {
      deviceId: "device-1",
      stationId: "station-1",
    });

    expect("context" in result).toBe(true);
    if ("context" in result) {
      expect(result.context.isCrossStationAllowed).toBe(true);
    }
  });
});
