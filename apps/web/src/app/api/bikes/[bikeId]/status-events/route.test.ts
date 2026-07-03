const mockAuthGetUser = jest.fn();
const mockProfileMaybeSingle = jest.fn();
const mockEventsSelect = jest.fn();
const mockEventsEq = jest.fn();
const mockEventsOrder = jest.fn();
const mockProfilesEq = jest.fn();
const mockFrom = jest.fn();

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      json: async () => body,
      status: init?.status ?? 200
    })
  }
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockAuthGetUser
    }
  }))
}));

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: jest.fn(() => ({
    from: mockFrom
  }))
}));

jest.mock("@/lib/supabase/config", () => ({
  getSupabaseConfig: jest.fn(() => ({
    supabasePublishableKey: "publishable-key",
    supabaseUrl: "https://example.supabase.co"
  }))
}));

import { GET } from "./route";

describe("/api/bikes/[bikeId]/status-events", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: "admin-1" } },
      error: null
    });

    mockProfileMaybeSingle.mockResolvedValue({
      data: { id: "admin-1", is_admin: true },
      error: null
    });

    mockEventsOrder.mockResolvedValue({
      data: [
        {
          id: "event-2",
          bike_id: "G-205",
          actor_id: "user-1",
          from_status: "in_use",
          to_status: "available",
          transition_kind: "ride_end",
          context: { requested_status: "available" },
          created_at: "2026-07-03T10:00:00.000Z"
        }
      ],
      error: null
    });

    mockProfilesEq.mockReturnValue({
      maybeSingle: mockProfileMaybeSingle
    });

    mockEventsEq.mockReturnValue({
      order: mockEventsOrder
    });

    mockEventsSelect.mockReturnValue({
      eq: mockEventsEq
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: mockProfilesEq
          })
        };
      }

      if (table === "bike_status_events") {
        return {
          select: mockEventsSelect
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
  });

  function buildRequest() {
    return {
      headers: {
        get: (name: string) => {
          if (name.toLowerCase() === "authorization") {
            return "Bearer session-token";
          }

          return null;
        }
      }
    } as unknown as Request;
  }

  it("returns bike status events for admins", async () => {
    const response = await GET(buildRequest(), {
      params: { bikeId: "G-205" }
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      bikeId: "G-205",
      events: [
        {
          actorId: "user-1",
          bikeId: "G-205",
          context: { requested_status: "available" },
          createdAt: "2026-07-03T10:00:00.000Z",
          fromStatus: "in_use",
          id: "event-2",
          toStatus: "available",
          transitionKind: "ride_end"
        }
      ]
    });
  });

  it("rejects non-admin users", async () => {
    mockProfileMaybeSingle.mockResolvedValueOnce({
      data: { id: "admin-1", is_admin: false },
      error: null
    });

    const response = await GET(buildRequest(), {
      params: { bikeId: "G-205" }
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "Admin access is required."
    });
  });
});
