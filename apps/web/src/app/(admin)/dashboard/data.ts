import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

import {
  selectExecutiveScorecardViewModel,
  selectOperationsDashboardViewModel,
  type DashboardInput,
  type ExecutiveScorecardViewModel,
  type OperationsDashboardViewModel
} from "./selectors";

type BikeRow = Database["public"]["Tables"]["bikes"]["Row"];
type RentalTransactionRow = Database["public"]["Tables"]["rental_transactions"]["Row"];
type BikeStatusEventRow = Database["public"]["Tables"]["bike_status_events"]["Row"];
type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];
type WalletTransactionRow = Database["public"]["Tables"]["wallet_transactions"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export interface DashboardViewModels {
  readonly executive: ExecutiveScorecardViewModel;
  readonly operations: OperationsDashboardViewModel;
}

export async function loadDashboardViewModels(): Promise<DashboardViewModels> {
  const supabase = await createClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString();

  const [
    { data: bikes, error: bikesError },
    { data: rideHistory, error: rideHistoryError },
    { data: wallets, error: walletsError },
    { data: walletTransactions, error: walletTransactionsError }
  ] = await Promise.all([
    supabase
      .from("bikes")
      .select(
        "id, model, ride_class, top_speed_kmh, pricing_label, rate_per_minute, status, active_rider_id, active_ride_start_location, active_ride_started_at, location, latitude, longitude, estimated_range_km, last_reported_at, image_url, created_at, updated_at"
      )
      .order("updated_at", { ascending: false }),
    supabase
      .from("rental_transactions")
      .select(
        "id, bike_id, profile_id, started_at, completed_at, duration_sec, distance_km, total_cost, rate_per_minute, billable_minutes, currency_code, wallet_transaction_id, fare_calculation_method, co2_saved_kg, start_location, end_location, route_label, payment_label, route, checkpoints"
      )
      .gte("completed_at", sevenDaysAgoIso)
      .order("completed_at", { ascending: false }),
    supabase
      .from("wallets")
      .select("id, balance, points, payment_methods, created_at, updated_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("wallet_transactions")
      .select("id, wallet_id, type, title, subtitle, amount, created_at")
      .order("created_at", { ascending: false })
      .limit(50)
  ]);

  if (bikesError) {
    throw new Error(bikesError.message);
  }

  if (rideHistoryError) {
    throw new Error(rideHistoryError.message);
  }

  if (walletsError) {
    throw new Error(walletsError.message);
  }

  if (walletTransactionsError) {
    throw new Error(walletTransactionsError.message);
  }

  const activeRiderIds = (bikes ?? [])
    .map((bike) => bike.active_rider_id)
    .filter((activeRiderId): activeRiderId is string => Boolean(activeRiderId));
  const activeBikeIds = (bikes ?? [])
    .filter((bike) => bike.status === "in_use")
    .map((bike) => bike.id);

  const [{ data: profiles, error: profilesError }, { data: bikeStatusEvents, error: bikeStatusEventsError }] =
    await Promise.all([
      activeRiderIds.length
        ? supabase.from("profiles").select("id, first_name, is_admin, created_at, updated_at").in("id", activeRiderIds)
        : Promise.resolve({ data: [] as ProfileRow[], error: null }),
      activeBikeIds.length
        ? supabase
            .from("bike_status_events")
            .select("id, bike_id, actor_id, from_status, to_status, transition_kind, context, created_at")
            .in("bike_id", activeBikeIds)
            .eq("transition_kind", "ride_start")
            .gte("created_at", sevenDaysAgoIso)
            .order("created_at", { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] as BikeStatusEventRow[], error: null })
    ]);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  if (bikeStatusEventsError) {
    throw new Error(bikeStatusEventsError.message);
  }

  const input: DashboardInput = {
    bikes: (bikes ?? []) as BikeRow[],
    bikeStatusEvents: (bikeStatusEvents ?? []) as BikeStatusEventRow[],
    profiles: profiles ?? [],
    rideHistory: (rideHistory ?? []) as RentalTransactionRow[],
    serverTime: new Date().toISOString(),
    walletTransactions: (walletTransactions ?? []) as WalletTransactionRow[],
    wallets: (wallets ?? []) as WalletRow[]
  };

  return {
    executive: selectExecutiveScorecardViewModel(input),
    operations: selectOperationsDashboardViewModel(input)
  };
}
