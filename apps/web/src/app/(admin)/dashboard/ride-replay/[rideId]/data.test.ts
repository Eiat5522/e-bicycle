jest.mock("@/lib/auth", () => ({
  requireAdmin: jest.fn()
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn()
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn()
}));

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

import { getRideReplayDetail } from "./data";

describe("getRideReplayDetail", () => {
  const createClientMock = jest.mocked(createClient);
  const notFoundMock = jest.mocked(notFound);
  const requireAdminMock = jest.mocked(requireAdmin);

  beforeEach(() => {
    jest.clearAllMocks();
    requireAdminMock.mockResolvedValue({
      user: { id: "admin-1", email: "admin@example.com" },
      profile: {
        id: "admin-1",
        firstName: "Admin",
        isAdmin: true,
        createdAt: "2026-04-01T00:00:00.000Z",
        updatedAt: "2026-04-01T00:00:00.000Z"
      }
    });
    notFoundMock.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
  });

  function createReplayClient() {
    const maybeSingleRide = jest.fn<Promise<{ data: unknown; error: null }>, []>(async () => ({
      data: {
        id: "ride-1",
        bike_id: "G-205",
        profile_id: "user-1",
        started_at: "2026-04-22T02:30:00.000Z",
        completed_at: "2026-04-22T02:42:00.000Z",
        duration_sec: 720,
        distance_km: 2.4,
        total_cost: 1.2,
        rate_per_minute: 0.1,
        billable_minutes: 12,
        currency_code: "THB",
        wallet_transaction_id: "txn-ride-1",
        fare_calculation_method: "ceil_minutes_v1",
        co2_saved_kg: 0.5,
        start_location: "Asok Interchange",
        end_location: "Benjakitti Park Drop-off",
        route_label: "Asok to Benjakitti",
        payment_label: "Charged to Glide wallet",
        route: [
          { latitude: 13.7372, longitude: 100.5606 },
          { latitude: 13.7295, longitude: 100.5601 }
        ],
        checkpoints: [
          {
            id: "ride-1-start",
            label: "Unlock",
            description: "Ride started at the Asok rack.",
            coordinates: { latitude: 13.7372, longitude: 100.5606 },
            elapsedSec: 0
          },
          {
            id: "ride-1-dropoff",
            label: "Drop-off",
            description: "Bike was returned inside the Benjakitti Park drop-off zone.",
            coordinates: { latitude: 13.7295, longitude: 100.5601 },
            elapsedSec: 720
          }
        ]
      },
      error: null
    }));
    const maybeSingleBike = jest.fn(async () => ({
      data: {
        id: "G-205",
        model: "Glide Urban",
        location: "Asok Interchange",
        ride_class: "City"
      },
      error: null
    }));
    const maybeSingleProfile = jest.fn(async () => ({
      data: { id: "user-1", first_name: "Mali" },
      error: null
    }));

    const rideQuery = {
      eq: jest.fn(() => ({ maybeSingle: maybeSingleRide }))
    };
    const bikeQuery = {
      eq: jest.fn(() => ({ maybeSingle: maybeSingleBike }))
    };
    const profileQuery = {
      eq: jest.fn(() => ({ maybeSingle: maybeSingleProfile }))
    };

    const client = {
      from: jest.fn((table: string) => {
        if (table === "bike_ride_history") {
          return { select: jest.fn(() => rideQuery) };
        }

        if (table === "bikes") {
          return { select: jest.fn(() => bikeQuery) };
        }

        if (table === "profiles") {
          return { select: jest.fn(() => profileQuery) };
        }

        throw new Error(`Unexpected table: ${table}`);
      })
    };

    return { client, maybeSingleRide };
  }

  it("maps a completed ride with route telemetry, fare details, and drop-off context", async () => {
    const { client } = createReplayClient();
    createClientMock.mockResolvedValue(client as never);

    await expect(getRideReplayDetail("ride-1")).resolves.toEqual(
      expect.objectContaining({
        bikeId: "G-205",
        bikeModel: "Glide Urban",
        riderLabel: "Mali",
        dropOffContext: "Benjakitti Park Drop-off",
        fareCalculationMethod: "ceil_minutes_v1",
        route: [
          { latitude: 13.7372, longitude: 100.5606 },
          { latitude: 13.7295, longitude: 100.5601 }
        ],
        checkpoints: expect.arrayContaining([
          expect.objectContaining({
            label: "Drop-off",
            description: "Bike was returned inside the Benjakitti Park drop-off zone."
          })
        ]),
        billableMinutes: 12,
        totalCost: 1.2
      })
    );
  });

  it("returns not found when the ride does not exist", async () => {
    const { client, maybeSingleRide } = createReplayClient();
    maybeSingleRide.mockResolvedValueOnce({ data: null, error: null });
    createClientMock.mockResolvedValue(client as never);

    await expect(getRideReplayDetail("missing-ride")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("normalizes missing route telemetry to empty arrays", async () => {
    const { client, maybeSingleRide } = createReplayClient();
    maybeSingleRide.mockResolvedValueOnce({
      data: {
        id: "ride-1",
        bike_id: "G-205",
        profile_id: null,
        started_at: "2026-04-22T02:30:00.000Z",
        completed_at: "2026-04-22T02:42:00.000Z",
        duration_sec: 720,
        distance_km: 2.4,
        total_cost: 1.2,
        rate_per_minute: 0.1,
        billable_minutes: 12,
        currency_code: "THB",
        wallet_transaction_id: null,
        fare_calculation_method: "ceil_minutes_v1",
        co2_saved_kg: 0.5,
        start_location: "Asok Interchange",
        end_location: "Benjakitti Park Drop-off",
        route_label: "Asok to Benjakitti",
        payment_label: "Charged to Glide wallet",
        route: null,
        checkpoints: null
      },
      error: null
    });
    createClientMock.mockResolvedValue(client as never);

    await expect(getRideReplayDetail("ride-1")).resolves.toEqual(
      expect.objectContaining({
        route: [],
        checkpoints: []
      })
    );
  });
});
