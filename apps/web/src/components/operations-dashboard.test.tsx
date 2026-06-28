import { render, screen } from "@testing-library/react";

import {
  selectOperationsDashboardViewModel,
  type DashboardInput
} from "@/app/(admin)/dashboard/selectors";

import { OperationsDashboard } from "./operations-dashboard";

const emptyInput: DashboardInput = {
  bikes: [],
  profiles: [],
  rideHistory: [],
  serverTime: "2026-06-28T09:30:00Z",
  walletTransactions: [],
  wallets: []
};

describe("OperationsDashboard", () => {
  it("renders empty states when live data has not arrived", () => {
    render(<OperationsDashboard data={selectOperationsDashboardViewModel(emptyInput)} />);

    expect(screen.getByText(/No completed rides have synced yet/)).toBeInTheDocument();
    expect(screen.getByText("No bikes available")).toBeInTheDocument();
    expect(screen.getByText("No ride telemetry yet.")).toBeInTheDocument();
  });

  it("links completed rides to the operations replay drill-down", () => {
    render(
      <OperationsDashboard
        data={selectOperationsDashboardViewModel({
          ...emptyInput,
          rideHistory: [
            {
              id: "ride-1",
              bike_id: "G-205",
              profile_id: "user-1",
              started_at: "2026-04-22T02:30:00.000Z",
              completed_at: "2026-04-22T02:42:00.000Z",
              created_at: "2026-04-22T02:42:00.000Z",
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
              route: [],
              checkpoints: []
            }
          ]
        })}
      />
    );

    expect(screen.getByRole("link", { name: /Replay Asok to Benjakitti/ })).toHaveAttribute(
      "href",
      "/dashboard/ride-replay/ride-1"
    );
  });
});
