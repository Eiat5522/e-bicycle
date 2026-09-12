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

import { GET, POST } from "./route";

function buildRequest(body: unknown): Request {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? "Bearer test-token" : null,
    },
    json: async () => body,
  } as unknown as Request;
}

let isAdmin = true;

beforeAll(() => {
  mockAuthGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });

  mockFrom.mockImplementation((table: string) => {
    if (table === "profiles") {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: "user-1", is_admin: isAdmin },
              error: null,
            }),
          }),
        }),
      };
    }

    if (table === "operational_reports") {
      return {
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({ data: [{ id: "r-1" }], error: null }),
        }),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });
});

describe("/api/reports/operational", () => {
  beforeEach(() => {
    isAdmin = true;
    mockRpc.mockReset();
  });

  it("lists existing reports on GET", async () => {
    const response = await GET(buildRequest({}), {} as never);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reports).toEqual([{ id: "r-1" }]);
  });

  it("generates a report on POST", async () => {
    mockRpc.mockResolvedValue({
      data: { id: "r-2", report_type: "daily" },
      error: null,
    });

    const response = await POST(buildRequest({ periodStart: "2026-07-01", periodEnd: "2026-07-31" }), {} as never);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.report.id).toBe("r-2");
    expect(mockRpc).toHaveBeenCalledWith("generate_operational_report", {
      p_period_start: "2026-07-01",
      p_period_end: "2026-07-31",
      p_report_type: "daily",
    });
  });

  it("returns 400 when the request body is not a JSON object", async () => {
    const response = await POST(buildRequest(null), {} as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("Request body must be valid JSON.");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns 403 when the caller is not an admin", async () => {
    isAdmin = false;

    const response = await POST(buildRequest({}), {} as never);
    expect(response.status).toBe(403);
  });
});
