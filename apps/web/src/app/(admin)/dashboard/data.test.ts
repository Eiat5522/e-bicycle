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
            id: "G-205"
          }
        ],
        error: null
      },
      bike_ride_history: { data: [], error: null },
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

          if (table === "bike_ride_history") {
            return {
              gte: jest.fn(() => ({
                order: jest.fn(async () => tables.bike_ride_history)
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
});
