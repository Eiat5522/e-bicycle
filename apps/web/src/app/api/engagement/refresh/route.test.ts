const mockAuthGetUser = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();
const mockEq = jest.fn();
const mockMaybeSingle = jest.fn();

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

import { POST } from "./route";

function buildRequest(body: unknown): Request {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? "Bearer test-token" : null,
    },
    text: async () => typeof body === "string" ? body : JSON.stringify(body),
    json: async () => body,
  } as unknown as Request;
}

describe("/api/engagement/refresh", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockFrom.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: mockEq }) });
    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle });
    mockMaybeSingle.mockResolvedValue({
      data: { id: "user-1", is_admin: true },
      error: null,
    });
  });

  it("refreshes all users when no profileId is supplied", async () => {
    mockRpc.mockResolvedValue({ data: 42, error: null });

    const response = await POST(buildRequest({}), {} as never);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.usersRefreshed).toBe(42);
    expect(mockRpc).toHaveBeenCalledWith("refresh_user_engagement", {});
  });

  it("refreshes a single user when profileId is supplied", async () => {
    mockRpc.mockResolvedValue({ data: 1, error: null });

    const response = await POST(buildRequest({ profileId: "user-9" }), {} as never);

    expect(response.status).toBe(201);
    expect(mockRpc).toHaveBeenCalledWith("refresh_user_engagement", { p_profile_id: "user-9" });
  });

  it("returns 400 when the JSON body is malformed", async () => {
    const response = await POST(buildRequest("not a valid json"), {} as never);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("Request body must be valid JSON.");
  });

  it("returns 400 when the JSON body is not an object", async () => {
    const response = await POST(buildRequest(null), {} as never);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe("Request body must be valid JSON.");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns a generic 500 when the profile lookup fails", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "relation details" } });

    const response = await POST(buildRequest({}), {} as never);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe("Unable to verify admin access.");
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to load admin profile.",
      { message: "relation details" },
    );

    consoleError.mockRestore();
  });

  it("returns 403 when the caller is not an admin", async () => {
    mockMaybeSingle.mockResolvedValue({ data: { id: "user-1", is_admin: false }, error: null });

    const response = await POST(buildRequest({}), {} as never);
    expect(response.status).toBe(403);
  });

  it("returns 500 when the RPC fails", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    const response = await POST(buildRequest({}), {} as never);
    expect(response.status).toBe(500);
  });
});
