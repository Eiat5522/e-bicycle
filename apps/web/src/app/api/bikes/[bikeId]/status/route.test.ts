const mockAuthGetUser = jest.fn();
const mockCurrentBikeMaybeSingle = jest.fn();
const mockUpdatedBikeMaybeSingle = jest.fn();
const mockSelectCurrentBike = jest.fn();
const mockSelectUpdatedBike = jest.fn();
const mockEqCurrentBike = jest.fn();
const mockEqUpdatedBike = jest.fn();
const mockInsertBikeStatusEvent = jest.fn();
const mockIsUpdatedBike = jest.fn();
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
        active_rider_id: null,
        location: "อโศก Interchange"
      },
      error: null
    });

    mockUpdatedBikeMaybeSingle.mockResolvedValue({
      data: {
        id: "G-205",
        status: "in_use",
        active_rider_id: "user-1",
        location: "อโศก Interchange"
      },
      error: null
    });

    mockInsertBikeStatusEvent.mockResolvedValue({
      data: null,
      error: null
    });

    const currentBikeQuery = {
      eq: mockEqCurrentBike,
      maybeSingle: mockCurrentBikeMaybeSingle
    };

    const updatedBikeQuery = {
      eq: mockEqUpdatedBike,
      is: mockIsUpdatedBike,
      select: mockSelectUpdatedBike
    };

    mockSelectCurrentBike.mockReturnValue(currentBikeQuery);
    mockEqCurrentBike.mockReturnValue(currentBikeQuery);

    mockUpdate.mockReturnValue(updatedBikeQuery);
    mockEqUpdatedBike.mockReturnValue(updatedBikeQuery);
    mockIsUpdatedBike.mockReturnValue(updatedBikeQuery);
    mockSelectUpdatedBike.mockReturnValue({
      maybeSingle: mockUpdatedBikeMaybeSingle
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "bikes") {
        return {
          select: mockSelectCurrentBike,
          update: mockUpdate
        };
      }

      if (table === "bike_status_events") {
        return {
          insert: mockInsertBikeStatusEvent
        };
      }

      throw new Error(`Unexpected table: ${table}`);
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
    expect(mockInsertBikeStatusEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: "user-1",
        bike_id: "G-205",
        from_status: "available",
        to_status: "in_use",
        transition_kind: "ride_start",
        context: expect.objectContaining({
          active_rider_id_before: null,
          active_rider_id_after: "user-1",
          active_ride_started_at: null,
          active_ride_start_location: null,
          bike_location: "อโศก Interchange",
          requested_status: "in_use",
          source: "apps/web/src/app/api/bikes/[bikeId]/status/route.ts"
        })
      })
    );
  });

  it("clears the active rider when ending the ride", async () => {
    mockCurrentBikeMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "G-205",
        status: "in_use",
        active_rider_id: "user-1",
        location: "อโศก Interchange"
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
    expect(mockInsertBikeStatusEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: "user-1",
        bike_id: "G-205",
        from_status: "in_use",
        to_status: "available",
        transition_kind: "ride_end",
        context: expect.objectContaining({
          active_rider_id_before: "user-1",
          active_rider_id_after: null,
          active_ride_started_at: null,
          active_ride_start_location: null,
          bike_location: "อโศก Interchange",
          requested_status: "available",
          source: "apps/web/src/app/api/bikes/[bikeId]/status/route.ts"
        })
      })
    );
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
