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

import { getBikeDetail } from "./data";

describe("getBikeDetail", () => {
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

  function createBikeDetailClient() {
    const maybeSingleBike = jest.fn(async () => ({
      data: {
        id: "G-205",
        model: "Glide Urban",
        ride_class: "City",
        top_speed_kmh: 32,
        pricing_label: "THB 1.00 / 10 min",
        rate_per_minute: 0.1,
        status: "in_use",
        active_rider_id: "user-1",
        location: "Asok Interchange",
        latitude: 13.7372,
        longitude: 100.5606,
        last_reported_at: "2026-04-22T03:00:00.000Z",
        image_url: null,
        created_at: "2026-04-01T10:00:00.000Z",
        updated_at: "2026-04-22T03:00:00.000Z"
      },
      error: null
    }));
    const orderRideHistory = jest.fn(async () => ({
      data: [
        {
          id: "ride-1",
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
          end_location: "Benjakitti Park",
          route_label: "Asok to Benjakitti",
          payment_label: "Charged to Glide wallet",
          route: [{ latitude: 13.7372, longitude: 100.5606 }],
          checkpoints: [
            {
              id: "ride-1-start",
              label: "Unlock",
              description: "Ride started.",
              coordinates: { latitude: 13.7372, longitude: 100.5606 },
              elapsedSec: 0
            }
          ]
        }
      ],
      error: null
    }));
    const orderStatusHistory = jest.fn(async () => ({
      data: [
        {
          id: "event-1",
          bike_id: "G-205",
          actor_id: "user-1",
          from_status: "available",
          to_status: "in_use",
          transition_kind: "ride_start",
          context: {
            active_ride_start_location: null,
            active_ride_started_at: null,
            active_rider_id_after: "user-1",
            active_rider_id_before: null,
            bike_location: "Asok Interchange",
            requested_status: "in_use",
            source: "apps/web/src/app/api/bikes/[bikeId]/status/route.ts"
          },
          created_at: "2026-04-22T02:15:00.000Z"
        }
      ],
      error: null
    }));
    const maybeSingleProfile = jest.fn(async () => ({
      data: { id: "user-1", first_name: "Mali" },
      error: null
    }));

    const bikeQuery = {
      eq: jest.fn(() => ({ maybeSingle: maybeSingleBike }))
    };
    const rideHistoryQuery = {
      eq: jest.fn(() => ({ order: orderRideHistory }))
    };
    const profileQuery = {
      eq: jest.fn(() => ({ maybeSingle: maybeSingleProfile }))
    };

    const client = {
      from: jest.fn((table: string) => {
        if (table === "bikes") {
          return { select: jest.fn(() => bikeQuery) };
        }

        if (table === "bike_ride_history") {
          return { select: jest.fn(() => rideHistoryQuery) };
        }

        if (table === "bike_status_events") {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: orderStatusHistory
              }))
            }))
          };
        }

        if (table === "profiles") {
          return { select: jest.fn(() => profileQuery) };
        }

        throw new Error(`Unexpected table: ${table}`);
      })
    };

    return {
      client,
      maybeSingleBike,
      maybeSingleProfile,
      orderRideHistory
    };
  }

  it("maps bike details with active rider and ride revenue history", async () => {
    const { client } = createBikeDetailClient();
    createClientMock.mockResolvedValue(client as never);

    const result = await getBikeDetail("G-205");

    expect(result).toMatchObject({
      bike: expect.objectContaining({
        id: "G-205",
        activeRiderId: "user-1",
        activeRiderLabel: "Mali",
        ratePerMinute: 0.1,
        status: "in_use"
      }),
      rideHistory: [
        expect.objectContaining({
          id: "ride-1",
          billableMinutes: 12,
          currencyCode: "THB",
          fareCalculationMethod: "ceil_minutes_v1",
          paymentLabel: "Charged to Glide wallet",
          totalCost: 1.2,
          walletTransactionId: "txn-ride-1"
        })
      ]
    });

    expect(result.statusHistory[0]).toMatchObject({
      actorId: "user-1",
      bikeId: "G-205",
      fromStatus: "available",
      toStatus: "in_use",
      transitionKind: "ride_start"
    });
  });
});
