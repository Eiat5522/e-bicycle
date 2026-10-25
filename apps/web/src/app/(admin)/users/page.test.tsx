import { render } from "@testing-library/react";

import UsersPage from "./page";

jest.mock("@/lib/auth", () => ({
  requireAdmin: jest.fn()
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn()
}));

jest.mock("@/components/user-management-table", () => ({
  UserManagementTable: jest.fn(() => null)
}));

jest.mock("../actions", () => ({
  createUserAction: jest.fn(),
  updateUserAction: jest.fn()
}));

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UserManagementTable } from "@/components/user-management-table";

describe("UsersPage", () => {
  const createClientMock = jest.mocked(createClient);
  const requireAdminMock = jest.mocked(requireAdmin);
  const userManagementTableMock = jest.mocked(UserManagementTable);

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

  it("loads ride history for users from rental transactions", async () => {
    const profilesOrder = jest.fn(async () => ({
      data: [
        {
          id: "user-1",
          first_name: "Mali",
          is_admin: false,
          created_at: "2026-04-01T00:00:00.000Z",
          updated_at: "2026-04-22T00:00:00.000Z"
        }
      ],
      error: null
    }));
    const walletTransactionsOrder = jest.fn(async () => ({
      data: [
        {
          id: "wallet-txn-1",
          wallet_id: "user-1",
          type: "ride_charge",
          title: "Ride charge",
          subtitle: "Asok to Benjakitti",
          amount: 1.2,
          created_at: "2026-04-22T02:42:00.000Z"
        }
      ],
      error: null
    }));
    const rentalTransactionsOrder = jest.fn(async () => ({
      data: [
        {
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
          wallet_transaction_id: "wallet-txn-1",
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
          ],
          bike: { model: "Glide Urban" }
        }
      ],
      error: null
    }));

    createClientMock.mockResolvedValue({
      from: jest.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: jest.fn(() => ({
              order: profilesOrder
            }))
          };
        }

        if (table === "wallet_transactions") {
          return {
            select: jest.fn(() => ({
              order: walletTransactionsOrder
            }))
          };
        }

        if (table === "rental_transactions") {
          return {
            select: jest.fn(() => ({
              not: jest.fn(() => ({
                order: rentalTransactionsOrder
              }))
            }))
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      })
    } as never);

    render(await UsersPage());

    expect(userManagementTableMock).toHaveBeenCalledWith(
      expect.objectContaining({
        users: [
          expect.objectContaining({
            id: "user-1",
            firstName: "Mali",
            rideHistory: [
              expect.objectContaining({
                id: "ride-1",
                bikeId: "G-205",
                bikeModel: "Glide Urban",
                walletTransactionId: "wallet-txn-1"
              })
            ]
          })
        ]
      }),
      undefined
    );
  });
});
