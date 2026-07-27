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
