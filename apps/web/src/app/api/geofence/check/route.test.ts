const mockAuthGetUser = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();

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
    rpc: mockRpc,
  })),
}));

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

jest.mock("@/lib/supabase/config", () => ({
  getSupabaseConfig: jest.fn(() => ({
    supabasePublishableKey: "publishable-key",
    supabaseUrl: "https://example.supabase.co",
  })),
}));

import { POST } from "./route";

function buildRequest(body: unknown): Request {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? "Bearer test-token" : null,
    },
    json: async () => body,
  } as unknown as Request;
}

describe("/api/geofence/check", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
  });

  it("returns 400 when latitude/longitude are missing", async () => {
    const response = await POST(buildRequest({}), {} as never);
    expect(response.status).toBe(400);
  });

  it("returns inside=true with the matching service area", async () => {
    mockRpc.mockResolvedValue({
      data: [{ id: "zone-1", zone_name: "Downtown", city_name: "Bangkok" }],
      error: null,
    });

    const response = await POST(buildRequest({ latitude: 13.75, longitude: 100.5 }), {} as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.inside).toBe(true);
    expect(body.serviceArea.id).toBe("zone-1");
  });

  it("returns inside=false when no area contains the point", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const response = await POST(buildRequest({ latitude: 1, longitude: 1 }), {} as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.inside).toBe(false);
    expect(body.serviceArea).toBeNull();
  });

  it("returns 500 when the RPC fails", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    const response = await POST(buildRequest({ latitude: 13.75, longitude: 100.5 }), {} as never);
    expect(response.status).toBe(500);
  });
});
