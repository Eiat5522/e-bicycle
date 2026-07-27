import { render, screen } from "@testing-library/react";

import {
  selectOperationsDashboardViewModel,
  type DashboardInput
} from "@/app/(admin)/dashboard/selectors";

import { OperationsDashboard } from "./operations-dashboard";

const emptyInput: DashboardInput = {
  bikes: [],
  bikeStatusEvents: [],
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
          ],
          bikeStatusEvents: [
            {
              actor_id: "profile-1",
              bike_id: "G-205",
              context: {
                active_ride_start_location: "Asok Interchange",
                active_ride_started_at: "2026-04-22T02:30:00.000Z",
                active_rider_id_after: "profile-1",
                active_rider_id_before: null,
                bike_location: "Asok Interchange",
                requested_status: "in_use",
                source: "apps/web/src/app/api/bikes/[bikeId]/status/route.ts"
              },
              created_at: "2026-04-22T02:30:00.000Z",
              from_status: "ready_to_rent",
              id: "event-ride-start",
              to_status: "in_use",
              transition_kind: "ride_start"
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

  it("links the low-range watchlist cards to the bicycle detail flow", () => {
    render(
      <OperationsDashboard
        data={selectOperationsDashboardViewModel({
          ...emptyInput,
          bikeStatusEvents: [],
          bikes: [
            {
              active_rider_id: null,
              active_ride_start_location: null,
              active_ride_started_at: null,
              battery_status: "unknown",
              color: null,
              created_at: "2026-06-28T08:00:00Z",
              current_battery_id: null,
              device_status: "unknown",
              estimated_range_km: 12,
              frame_number: null,
              id: "G-001",
              image_url: null,
              last_reported_at: "2026-06-28T08:50:00Z",
              latitude: 13.7563,
              location: "Siam Square",
              longitude: 100.5018,
              maintenance_summary: null,
              model: "Glide Mini",
              pricing_label: "฿0.90 / 10 min",
              qr_code: null,
              rate_per_minute: 0.09,
              ride_class: null,
              serial_number: null,
              station_id: null,
              status: "maintenance_required",
              top_speed_kmh: 24,
              updated_at: "2026-06-28T08:50:00Z"
            },
            {
              active_rider_id: null,
              active_ride_start_location: null,
              active_ride_started_at: null,
              battery_status: "unknown",
              color: null,
              created_at: "2026-06-28T08:10:00Z",
              current_battery_id: null,
              device_status: "unknown",
              estimated_range_km: 28,
              frame_number: null,
              id: "G-002",
              image_url: null,
              last_reported_at: "2026-06-28T08:55:00Z",
              latitude: 13.7262,
              location: "Asok Interchange",
              longitude: 100.5291,
              maintenance_summary: null,
              model: "Glide City",
              pricing_label: "฿1.20 / 10 min",
              qr_code: null,
              rate_per_minute: 0.12,
              ride_class: null,
              serial_number: null,
              station_id: null,
              status: "ready_to_rent",
              top_speed_kmh: 28,
              updated_at: "2026-06-28T08:55:00Z"
            }
          ]
        })}
      />
    );

    expect(screen.getByRole("link", { name: "Open bicycle G-001" })).toHaveAttribute(
      "href",
      "/bicycles/G-001"
    );
  });
});
