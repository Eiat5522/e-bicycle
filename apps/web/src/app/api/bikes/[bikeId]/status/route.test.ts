const mockAuthGetUser = jest.fn();
const mockCurrentBikeMaybeSingle = jest.fn();
const mockUpdatedBikeMaybeSingle = jest.fn();
const mockSelectCurrentBike = jest.fn();
const mockSelectUpdatedBike = jest.fn();
const mockEqCurrentBike = jest.fn();
const mockEqUpdatedBike = jest.fn();
const mockUpdate = jest.fn();
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

import { PATCH } from "./route";

describe("/api/bikes/[bikeId]/status", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null
    });

    mockCurrentBikeMaybeSingle.mockResolvedValue({
      data: {
        id: "G-205",
        status: "available",
        active_rider_id: null
      },
      error: null
    });

    mockUpdatedBikeMaybeSingle.mockResolvedValue({
      data: {
        id: "G-205",
        status: "in_use",
        active_rider_id: "user-1"
      },
      error: null
    });

    mockSelectCurrentBike.mockReturnValue({
      eq: mockEqCurrentBike
    });

    mockEqCurrentBike.mockReturnValue({
      maybeSingle: mockCurrentBikeMaybeSingle
    });

    mockUpdate.mockReturnValue({
      eq: mockEqUpdatedBike
    });

    mockEqUpdatedBike.mockReturnValue({
      select: mockSelectUpdatedBike
    });

    mockSelectUpdatedBike.mockReturnValue({
      maybeSingle: mockUpdatedBikeMaybeSingle
    });

    mockFrom.mockImplementation((table: string) => {
      if (table !== "bikes") {
        throw new Error(`Unexpected table: ${table}`);
      }

      return {
        select: mockSelectCurrentBike,
        update: mockUpdate
      };
    });
  });

  function buildRequest(body: unknown) {
    return {
      headers: {
        get: (name: string) => {
          if (name.toLowerCase() === "authorization") {
            return "Bearer session-token";
          }

          return null;
        }
      },
      json: async () => body
    } as unknown as Request;
  }

  it("updates a bike status in Supabase and assigns the active rider", async () => {
    const response = await PATCH(buildRequest({ status: "in_use" }), {
      params: { bikeId: "G-205" }
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      bikeId: "G-205",
      status: "in_use",
      activeRiderId: "user-1"
    });
  });

  it("clears the active rider when ending the ride", async () => {
    mockCurrentBikeMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "G-205",
        status: "in_use",
        active_rider_id: "user-1"
      },
      error: null
    });
    mockUpdatedBikeMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "G-205",
        status: "available",
        active_rider_id: null
      },
      error: null
    });

    const response = await PATCH(buildRequest({ status: "available" }), {
      params: { bikeId: "G-205" }
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      bikeId: "G-205",
      status: "available",
      activeRiderId: null
    });
  });

  it("rejects invalid statuses", async () => {
    const response = await PATCH(buildRequest({ status: "offline" }), {
      params: { bikeId: "G-205" }
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Bike status is invalid."
    });
  });
});
