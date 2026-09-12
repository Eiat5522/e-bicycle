import { render } from "@testing-library/react";

import BicyclesPage from "./page";

jest.mock("@/lib/auth", () => ({
  requireAdmin: jest.fn()
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn()
}));

jest.mock("@/components/bicycle-management", () => ({
  BicycleManagementList: jest.fn(() => null)
}));

import { requireAdmin } from "@/lib/auth";
import { BicycleManagementList } from "@/components/bicycle-management";
import { createClient } from "@/lib/supabase/server";

describe("BicyclesPage", () => {
  const createClientMock = jest.mocked(createClient);
  const requireAdminMock = jest.mocked(requireAdmin);
  const bicycleManagementListMock = jest.mocked(BicycleManagementList);

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
  });

  it("builds ride counts from rental transactions", async () => {
    const from = jest.fn((table: string) => {
      if (table === "bikes") {
        return {
          select: jest.fn(() => ({
            order: bikesOrder
          }))
        };
      }

      if (table === "rental_transactions") {
        return {
          select: rideHistorySelect
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });
    const bikesOrder = jest.fn(async () => ({
      data: [
        {
          id: "bike-1",
          model: "Glide Urban",
          ride_class: "city",
          top_speed_kmh: 25,
          pricing_label: "THB 0.10/min",
          rate_per_minute: 0.1,
          status: "available",
          active_rider_id: null,
          location: "Asok",
          latitude: 13.7372,
          longitude: 100.5606,
          last_reported_at: "2026-04-22T02:42:00.000Z",
          image_url: null,
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-22T02:42:00.000Z"
        },
        {
          id: "bike-2",
          model: "Glide Cargo",
          ride_class: "cargo",
          top_speed_kmh: 20,
          pricing_label: "THB 0.15/min",
          rate_per_minute: 0.15,
          status: "maintenance",
          active_rider_id: null,
          location: "Sathon",
          latitude: 13.7249,
          longitude: 100.5343,
          last_reported_at: "2026-04-22T03:00:00.000Z",
          image_url: null,
          created_at: "2026-04-03T00:00:00.000Z",
          updated_at: "2026-04-22T03:00:00.000Z"
        }
      ],
      error: null
    }));
    const rideHistorySelect = jest.fn(async () => ({
      data: [{ bike_id: "bike-1" }, { bike_id: "bike-1" }, { bike_id: "bike-2" }],
      error: null
    }));

    createClientMock.mockResolvedValue({
      from
    } as never);

    render(await BicyclesPage());

    expect(from).toHaveBeenCalledWith("bikes");
    expect(from).toHaveBeenCalledWith("rental_transactions");
    expect(from).not.toHaveBeenCalledWith("bike_ride_history");
    expect(rideHistorySelect).toHaveBeenCalledWith("bike_id");
    expect(bicycleManagementListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rideCounts: { "bike-1": 2, "bike-2": 1 }
      }),
      undefined
    );
  });
});
