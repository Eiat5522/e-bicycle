import type { Database } from "@/lib/supabase/database.types";
import type {
  BikeRow,
  BikeStatusEventRow,
  BikeRideHistoryRow,
  ProfileRow
} from "@/lib/supabase/database.aliases";

import {
  selectExecutiveScorecardViewModel,
  selectOperationsDashboardViewModel
} from "./selectors";

type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];
type WalletTransactionRow = Database["public"]["Tables"]["wallet_transactions"]["Row"];

function makeBikeRow(overrides: Partial<BikeRow> = {}): BikeRow {
  return {
    active_rider_id: null,
    active_ride_start_location: null,
    active_ride_started_at: null,
    battery_status: "unknown",
    color: null,
    created_at: "2026-06-28T07:30:00Z",
    current_battery_id: null,
    device_status: "unknown",
    estimated_range_km: 35,
    frame_number: null,
    id: "G-001",
    image_url: null,
    last_reported_at: "2026-06-28T08:45:00Z",
    latitude: 13.7563,
    location: "Siam Square",
    longitude: 100.5018,
    maintenance_summary: null,
    model: "Glide City",
    pricing_label: "฿0.90 / 10 min",
    qr_code: null,
    rate_per_minute: 0.09,
    ride_class: null,
    serial_number: null,
    station_id: null,
    status: "ready_to_rent",
    top_speed_kmh: 24,
    updated_at: "2026-06-28T08:45:00Z",
    ...overrides
  };
}

function makeRideHistoryRow(overrides: Partial<BikeRideHistoryRow> = {}): BikeRideHistoryRow {
  return {
    bike_id: "G-001",
    billable_minutes: 18,
    checkpoints: [],
    co2_saved_kg: 0.7,
    completed_at: "2026-06-27T09:00:00Z",
    created_at: "2026-06-27T09:01:00Z",
    currency_code: "THB",
    distance_km: 3.2,
    duration_sec: 1080,
    end_location: "Benjakitti Park",
    fare_calculation_method: "ceil_minutes_v1",
    id: "ride-history-1",
    payment_label: "Charged to Visa **** 4242",
    profile_id: "profile-1",
    rate_per_minute: 0.09,
    route: [],
    route_label: "Siam to Benjakitti",
    started_at: "2026-06-27T08:42:00Z",
    start_location: "Siam Square",
    total_cost: 1.62,
    wallet_transaction_id: "txn-1",
    ...overrides
  };
}

function makeBikeStatusEventRow(overrides: Partial<BikeStatusEventRow> = {}): BikeStatusEventRow {
  return {
    actor_id: "profile-1",
    bike_id: "G-001",
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
    transition_kind: "ride_start",
    ...overrides
  };
}

function makeWalletRow(overrides: Partial<WalletRow> = {}): WalletRow {
  return {
    balance: 42.5,
    created_at: "2026-06-28T07:00:00Z",
    id: "wallet-1",
    payment_methods: ["Visa **** 4242", "PromptPay"],
    points: 120,
    updated_at: "2026-06-28T07:00:00Z",
    ...overrides
  };
}

function makeWalletTransactionRow(
  overrides: Partial<WalletTransactionRow> = {}
): WalletTransactionRow {
  return {
    amount: -4.25,
    created_at: "2026-06-28T08:10:00Z",
    id: "txn-1",
    subtitle: "Ride to downtown",
    title: "Ride charge",
    type: "ride",
    wallet_id: "wallet-1",
    ...overrides
  };
}

function makeProfileRow(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    consent_agreed: false,
    consent_agreed_at: null,
    created_at: "2026-06-28T07:00:00Z",
    driver_license_reference: null,
    email: null,
    first_name: "Alex",
    full_name: null,
    id: "profile-1",
    identity_verification_status: "unverified",
    is_admin: false,
    membership_id: null,
    phone: null,
    registration_date: "2026-06-28T07:00:00Z",
    student_status: false,
    updated_at: "2026-06-28T07:00:00Z",
    user_status: "active",
    user_type: "citizen",
    ...overrides
  };
}

describe("dashboard selectors", () => {
  it("maps live rows into executive and operations view models", () => {
    const input = {
      bikes: [
        makeBikeRow(),
        makeBikeRow({
          active_rider_id: "profile-1",
          active_ride_start_location: "Siam Square",
          active_ride_started_at: "2026-06-28T08:00:00Z",
          estimated_range_km: 28,
          id: "G-002",
          last_reported_at: "2026-06-28T08:50:00Z",
          location: "Asok Interchange",
          model: "Glide Pro",
          status: "in_use",
          updated_at: "2026-06-28T08:50:00Z"
        }),
        makeBikeRow({
          estimated_range_km: 18,
          id: "G-003",
          model: "Glide Mini",
          status: "maintenance_required"
        })
      ],
      bikeStatusEvents: [makeBikeStatusEventRow({ bike_id: "G-002" })],
      profiles: [makeProfileRow()],
      rideHistory: [
        makeRideHistoryRow(),
        makeRideHistoryRow({
          completed_at: "2026-06-28T09:10:00Z",
          created_at: "2026-06-28T09:12:00Z",
          distance_km: 4.1,
          duration_sec: 1320,
          id: "ride-history-2",
          route_label: "Asok to Lumphini",
          total_cost: 2.8
        })
      ],
      serverTime: "2026-06-28T09:30:00Z",
      walletTransactions: [makeWalletTransactionRow()],
      wallets: [makeWalletRow()]
    };

    const executive = selectExecutiveScorecardViewModel(input);
    const operations = selectOperationsDashboardViewModel(input);

    expect(executive.headlineMetrics).toHaveLength(5);
    expect(executive.trends).toHaveLength(7);
    expect(executive.insights).toHaveLength(3);
    expect(executive.headlineMetrics[0]).toEqual(
      expect.objectContaining({
        label: "Wallet float",
        value: expect.stringMatching(/^฿/),
        trendKey: "revenue"
      })
    );

    expect(operations.activeRide?.bikeId).toBe("G-002");
    expect(operations.paymentMethodsCount).toBe(2);
    expect(operations.summaryMetrics[0]?.value).toBe("1/3");
    expect(operations.watchlist[0]?.id).toBe("G-003");
    expect(operations.recentRoutes).toHaveLength(2);
  });

  it("returns empty view models when Supabase has not returned live rows yet", () => {
    const emptyInput = {
      bikes: [],
      bikeStatusEvents: [],
      profiles: [],
      rideHistory: [],
      serverTime: "2026-06-28T09:30:00Z",
      walletTransactions: [],
      wallets: []
    };

    const executive = selectExecutiveScorecardViewModel(emptyInput);
    const operations = selectOperationsDashboardViewModel(emptyInput);

    expect(executive.headlineMetrics).toHaveLength(0);
    expect(executive.trends).toHaveLength(0);
    expect(executive.insights).toHaveLength(0);
    expect(operations.activeRide).toBeNull();
    expect(operations.recentRoutes).toHaveLength(0);
    expect(operations.watchlist).toHaveLength(0);
  });

  it("uses persisted ride start events and live bike coordinates for the active ride summary", () => {
    const activeInput = {
      bikes: [
        makeBikeRow({
          id: "G-001",
          location: "Siam Square",
          latitude: 13.7563,
          longitude: 100.5018,
          status: "ready_to_rent"
        }),
        makeBikeRow({
          active_rider_id: "profile-1",
          active_ride_start_location: "Siam Square",
          active_ride_started_at: "2026-06-28T08:00:00Z",
          id: "G-002",
          latitude: 13.7372,
          longitude: 100.5606,
          last_reported_at: "2026-06-28T08:50:00Z",
          location: "Asok Interchange",
          status: "in_use"
        })
      ],
      bikeStatusEvents: [
        makeBikeStatusEventRow({
          bike_id: "G-002",
          context: {
            active_ride_start_location: "Siam Square",
            active_ride_started_at: "2026-06-28T08:00:00Z",
            active_rider_id_after: "profile-1",
            active_rider_id_before: null,
            bike_location: "Siam Square",
            requested_status: "in_use",
            source: "apps/web/src/app/api/bikes/[bikeId]/status/route.ts"
          }
        })
      ],
      profiles: [makeProfileRow()],
      rideHistory: [],
      serverTime: "2026-06-28T09:30:00Z",
      walletTransactions: [],
      wallets: []
    };

    const operations = selectOperationsDashboardViewModel(activeInput);

    expect(operations.activeRide?.bikeId).toBe("G-002");
    expect(operations.activeRide?.currentCost).toBeGreaterThan(0);
    expect(operations.activeRide?.distanceKm).toBeGreaterThan(0);
    expect(operations.activeRide?.dropoffState).toBe("en_route");
    expect(operations.activeRide?.nextDropoffZoneKm).toBeGreaterThan(0);
    expect(operations.summaryMetrics[1]?.note).toContain("en route");
  });
});
