jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn()
}));

jest.mock("./selectors", () => ({
  selectExecutiveScorecardViewModel: jest.fn(() => ({ headlineMetrics: [] })),
  selectOperationsDashboardViewModel: jest.fn(() => ({ summaryMetrics: [] }))
}));

import { createClient } from "@/lib/supabase/server";

import { loadDashboardViewModels } from "./data";

describe("loadDashboardViewModels", () => {
  const createClientMock = jest.mocked(createClient);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createDashboardClient({ profileError = null }: { readonly profileError?: Error | null } = {}) {
    const tables = {
      bikes: {
        data: [
          {
            active_rider_id: "profile-1",
            id: "G-205",
            status: "in_use"
          }
        ],
        error: null
      },
      bike_status_events: {
        data: [
          {
            actor_id: "profile-1",
            bike_id: "G-205",
            context: {
              active_ride_start_location: "Siam Square",
              active_ride_started_at: "2026-06-28T08:00:00Z",
              active_rider_id_after: "profile-1",
              active_rider_id_before: null,
              bike_location: "Siam Square",
              requested_status: "in_use",
              source: "apps/web/src/app/api/bikes/[bikeId]/status/route.ts"
            },
            created_at: "2026-06-28T08:00:00Z",
            from_status: "ready_to_rent",
            id: "bike-status-event-1",
            to_status: "in_use",
            transition_kind: "ride_start"
          }
        ],
        error: null
      },
      rental_transactions: { data: [], error: null },
      wallets: { data: [], error: null },
      wallet_transactions: { data: [], error: null },
      profiles: {
        data: profileError ? null : [{ id: "profile-1", first_name: "Mali" }],
        error: profileError
      }
    };

    return {
      from: jest.fn((table: keyof typeof tables) => ({
        select: jest.fn(() => {
          if (table === "profiles") {
            return {
              in: jest.fn(async () => tables.profiles)
            };
          }

          if (table === "wallet_transactions") {
            return {
              order: jest.fn(() => ({
                limit: jest.fn(async () => tables.wallet_transactions)
              }))
            };
          }

          if (table === "rental_transactions") {
            return {
              gte: jest.fn(() => ({
                order: jest.fn(async () => tables.rental_transactions)
              }))
            };
          }

          if (table === "bike_status_events") {
            return {
              in: jest.fn(() => ({
                eq: jest.fn(() => ({
                  gte: jest.fn(() => ({
                    order: jest.fn(() => ({
                      limit: jest.fn(async () => tables.bike_status_events)
                    }))
                  }))
                }))
              }))
            };
          }

          return {
            order: jest.fn(async () => tables[table])
          };
        })
      }))
    };
  }

  it("throws when active rider profiles fail to load", async () => {
    const client = createDashboardClient({ profileError: new Error("profiles blocked by RLS") });
    createClientMock.mockResolvedValue(client as never);

    await expect(loadDashboardViewModels()).rejects.toThrow("profiles blocked by RLS");
  });

  it("loads active ride start events for live ride summaries", async () => {
    const client = createDashboardClient();
    createClientMock.mockResolvedValue(client as never);

    await loadDashboardViewModels();

    expect(client.from).toHaveBeenCalledWith("bike_status_events");
  });
});
