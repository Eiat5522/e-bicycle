import {
  calculateBillableMinutes,
  calculateRideRevenue,
  type Coordinates,
  type RideHistoryCheckpoint,
  type RideHistoryItem
} from "@glide/shared";

import {
  getRideHistoryById as getMockRideHistoryById,
  mockActiveRide,
  mockRideHistory,
  mockRideSummary
} from "@glide/api";

import { hasSupabaseConfig, supabase } from "./supabase";
import type { Database } from "./supabase.types";

type RentalTransactionRow = Database["public"]["Tables"]["rental_transactions"]["Row"];
type RentalTransactionInsert = Database["public"]["Tables"]["rental_transactions"]["Insert"];

export interface ConfiguredRideHistoryService {
  getRideHistory(): Promise<readonly RideHistoryItem[]>;
  getRideHistoryById(id: string): Promise<RideHistoryItem | undefined>;
  completeRide(input: CompleteRideInput): Promise<RideHistoryItem>;
  completeDemoRide(input: { bikeId: string }): Promise<RideHistoryItem>;
}

export interface CompleteRideInput {
  readonly bikeId: string;
  readonly durationSec?: number;
  readonly distanceKm?: number;
  readonly totalCost?: number;
  readonly ratePerMinute?: number;
  readonly routeLabel?: string;
  readonly endLocation?: string;
  readonly co2SavedKg?: number;
  readonly route?: readonly Coordinates[];
  readonly checkpoints?: readonly RideHistoryCheckpoint[];
}

async function getAuthenticatedUserId() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return session?.user.id ?? null;
}

async function getBikeModelMap(bikeIds: readonly string[]) {
  if (!bikeIds.length) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase.from("bikes").select("id, model").in("id", [...bikeIds]);

  if (error) {
    throw new Error(`Failed to fetch bike details: ${error.message}`);
  }

  return new Map((data ?? []).map((bike) => [bike.id, bike.model]));
}

function mapRideHistoryRow(
  row: Pick<
    RentalTransactionRow,
    | "id"
    | "bike_id"
    | "started_at"
    | "completed_at"
    | "duration_sec"
    | "distance_km"
    | "total_cost"
    | "rate_per_minute"
    | "billable_minutes"
    | "currency_code"
    | "wallet_transaction_id"
    | "fare_calculation_method"
    | "co2_saved_kg"
    | "start_location"
    | "end_location"
    | "route_label"
    | "payment_label"
    | "route"
    | "checkpoints"
  >,
  bikeModelMap: ReadonlyMap<string, string>
): RideHistoryItem {
  return {
    id: row.id,
    bikeId: row.bike_id,
    bikeModel: bikeModelMap.get(row.bike_id) ?? row.bike_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationSec: row.duration_sec,
    distanceKm: Number(row.distance_km),
    totalCost: Number(row.total_cost),
    ratePerMinute: Number(row.rate_per_minute),
    billableMinutes: row.billable_minutes,
    currencyCode: row.currency_code,
    walletTransactionId: row.wallet_transaction_id,
    fareCalculationMethod: row.fare_calculation_method,
    co2SavedKg: Number(row.co2_saved_kg),
    startLocation: row.start_location,
    endLocation: row.end_location,
    routeLabel: row.route_label,
    paymentLabel: row.payment_label,
    route: row.route as unknown as readonly Coordinates[],
    checkpoints: row.checkpoints as unknown as readonly RideHistoryCheckpoint[]
  };
}

function createSupabaseRideHistoryService(): ConfiguredRideHistoryService {
  return {
    async getRideHistory() {
      const userId = await getAuthenticatedUserId();

      if (!userId) {
        throw new Error("No active rider session was found.");
      }

      const { data, error } = await supabase
        .from("rental_transactions")
        .select(
          "id, bike_id, profile_id, started_at, completed_at, duration_sec, distance_km, total_cost, rate_per_minute, billable_minutes, currency_code, wallet_transaction_id, fare_calculation_method, co2_saved_kg, start_location, end_location, route_label, payment_label, route, checkpoints"
        )
        .eq("profile_id", userId)
        .order("completed_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch ride history: ${error.message}`);
      }

      const bikeModelMap = await getBikeModelMap((data ?? []).map((row) => row.bike_id));

      return (data ?? []).map((row) => mapRideHistoryRow(row, bikeModelMap));
    },

    async getRideHistoryById(id: string) {
      const userId = await getAuthenticatedUserId();

      if (!userId) {
        throw new Error("No active rider session was found.");
      }

      const { data, error } = await supabase
        .from("rental_transactions")
        .select(
          "id, bike_id, profile_id, started_at, completed_at, duration_sec, distance_km, total_cost, rate_per_minute, billable_minutes, currency_code, wallet_transaction_id, fare_calculation_method, co2_saved_kg, start_location, end_location, route_label, payment_label, route, checkpoints"
        )
        .eq("id", id)
        .eq("profile_id", userId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch ride details: ${error.message}`);
      }

      if (!data) {
        return undefined;
      }

      const bikeModelMap = await getBikeModelMap([data.bike_id]);

      return mapRideHistoryRow(data, bikeModelMap);
    },

    async completeRide(input) {
      const userId = await getAuthenticatedUserId();

      if (!userId) {
        throw new Error("No active rider session was found.");
      }

      const route = (input.route ?? mockRideHistory[0]?.route ?? []) as unknown as NonNullable<
        RentalTransactionInsert["route"]
      >;
      const checkpoints = (input.checkpoints ?? mockRideHistory[0]?.checkpoints ?? []) as unknown as NonNullable<
        RentalTransactionInsert["checkpoints"]
      >;

      const { data, error } = await supabase.rpc("complete_ride", {
        p_bike_id: input.bikeId,
        p_distance_km: input.distanceKm ?? mockRideSummary.distanceKm,
        p_end_location: input.endLocation ?? mockActiveRide.endLocation ?? "Benjakitti Park",
        p_route_label: input.routeLabel ?? mockRideSummary.routeLabel,
        p_route: route,
        p_checkpoints: checkpoints,
        p_co2_saved_kg: input.co2SavedKg ?? mockRideSummary.co2SavedKg
      });

      if (error) {
        throw new Error(`Failed to complete ride: ${error.message}`);
      }

      if (!data) {
        throw new Error("The completed ride could not be loaded.");
      }

      const bikeModelMap = await getBikeModelMap([data.bike_id]);

      return mapRideHistoryRow(data, bikeModelMap);
    },

    async completeDemoRide({ bikeId }) {
      return this.completeRide({ bikeId });
    }
  };
}

function createMockRideHistoryService(): ConfiguredRideHistoryService {
  return {
    async getRideHistory() {
      return mockRideHistory;
    },
    async getRideHistoryById(id: string) {
      return getMockRideHistoryById(id);
    },
    async completeRide(input) {
      const ratePerMinute = input.ratePerMinute ?? 0.17;
      const durationSec = input.durationSec ?? mockActiveRide.durationSec;
      const distanceKm = input.distanceKm ?? mockRideSummary.distanceKm;
      const billableMinutes = calculateBillableMinutes(durationSec);
      const totalCost = calculateRideRevenue({
        durationSec,
        ratePerMinute
      });

      return {
        ...(mockRideHistory[0] ?? {
          id: `mock-ride-${Date.now()}`,
          bikeId: input.bikeId,
          bikeModel: input.bikeId,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          durationSec,
          distanceKm,
          totalCost: input.totalCost ?? totalCost,
          ratePerMinute,
          billableMinutes,
          currencyCode: "THB",
          walletTransactionId: null,
          fareCalculationMethod: "ceil_minutes_v1",
          co2SavedKg: input.co2SavedKg ?? mockRideSummary.co2SavedKg,
          startLocation: mockActiveRide.startLocation,
          endLocation: input.endLocation ?? mockActiveRide.endLocation ?? "Benjakitti Park",
          routeLabel: input.routeLabel ?? mockRideSummary.routeLabel,
          paymentLabel: "Charged to your Glide wallet",
          route: input.route ?? [],
          checkpoints: input.checkpoints ?? []
        }),
        id: `mock-ride-${Date.now()}`,
        bikeId: input.bikeId,
        bikeModel: mockRideHistory[0]?.bikeModel ?? input.bikeId,
        durationSec,
        distanceKm,
        totalCost: input.totalCost ?? totalCost,
        ratePerMinute,
        billableMinutes,
        co2SavedKg: input.co2SavedKg ?? mockRideSummary.co2SavedKg,
        endLocation: input.endLocation ?? mockActiveRide.endLocation ?? "Benjakitti Park",
        routeLabel: input.routeLabel ?? mockRideSummary.routeLabel,
        route: input.route ?? mockRideHistory[0]?.route ?? [],
        checkpoints: input.checkpoints ?? mockRideHistory[0]?.checkpoints ?? []
      };
    },
    async completeDemoRide({ bikeId }) {
      return this.completeRide({ bikeId });
    }
  };
}

export const configuredRideHistoryService: ConfiguredRideHistoryService = hasSupabaseConfig
  ? createSupabaseRideHistoryService()
  : createMockRideHistoryService();
