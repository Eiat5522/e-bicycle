import type { RideHistoryItem } from "@glide/shared";

import { createUserAction, updateUserAction } from "@/app/(admin)/actions";
import { UserManagementTable } from "@/components/user-management-table";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { requireAdmin } from "@/lib/auth";

type BikeRideHistoryWithBike = Pick<
  Database["public"]["Tables"]["bike_ride_history"]["Row"],
  | "id"
  | "bike_id"
  | "profile_id"
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
> & {
  readonly bike: Pick<Database["public"]["Tables"]["bikes"]["Row"], "model"> | null;
};

function mapRideHistory(row: BikeRideHistoryWithBike): RideHistoryItem {
  return {
    id: row.id,
    bikeId: row.bike_id,
    bikeModel: row.bike?.model ?? row.bike_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationSec: row.duration_sec,
    distanceKm: Number(row.distance_km),
    totalCost: Number(row.total_cost),
    ratePerMinute: Number(row.rate_per_minute),
    billableMinutes: Number(row.billable_minutes),
    currencyCode: row.currency_code,
    walletTransactionId: row.wallet_transaction_id,
    fareCalculationMethod: row.fare_calculation_method,
    co2SavedKg: Number(row.co2_saved_kg),
    startLocation: row.start_location,
    endLocation: row.end_location,
    routeLabel: row.route_label,
    paymentLabel: row.payment_label,
    route: row.route as unknown as RideHistoryItem["route"],
    checkpoints: row.checkpoints as unknown as RideHistoryItem["checkpoints"]
  };
}

export default async function UsersPage() {
  await requireAdmin();

  const supabase = await createClient();
  const [
    { data: profiles, error: profilesError },
    { data: transactions, error: transactionsError },
    { data: rideHistory, error: rideHistoryError }
  ] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, first_name, is_admin, created_at, updated_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("wallet_transactions")
        .select("id, wallet_id, type, title, subtitle, amount, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("bike_ride_history")
        .select(
          "id, bike_id, profile_id, started_at, completed_at, duration_sec, distance_km, total_cost, rate_per_minute, billable_minutes, currency_code, wallet_transaction_id, fare_calculation_method, co2_saved_kg, start_location, end_location, route_label, payment_label, route, checkpoints, bike:bikes(model)"
        )
        .not("profile_id", "is", null)
        .order("completed_at", { ascending: false })
    ]);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  if (transactionsError) {
    throw new Error(transactionsError.message);
  }

  if (rideHistoryError) {
    throw new Error(rideHistoryError.message);
  }

  const transactionsByUserId = transactions.reduce<Record<string, typeof transactions>>((accumulator, transaction) => {
    const list = accumulator[transaction.wallet_id] ?? [];
    list.push(transaction);
    accumulator[transaction.wallet_id] = list;

    return accumulator;
  }, {});

  const rideHistoryByUserId = rideHistory.reduce<Record<string, readonly RideHistoryItem[]>>(
    (accumulator, ride) => {
      if (!ride.profile_id) {
        return accumulator;
      }

      const list = accumulator[ride.profile_id] ?? [];
      accumulator[ride.profile_id] = [...list, mapRideHistory(ride as BikeRideHistoryWithBike)];

      return accumulator;
    },
    {}
  );

  return (
    <UserManagementTable
      onCreateUser={createUserAction}
      onUpdateUser={updateUserAction}
      users={profiles.map((profile) => ({
        id: profile.id,
        firstName: profile.first_name,
        isAdmin: profile.is_admin,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
        rideHistory: rideHistoryByUserId[profile.id] ?? [],
        transactions: (transactionsByUserId[profile.id] ?? []).map((transaction) => ({
          id: transaction.id,
          type: transaction.type as Database["public"]["Tables"]["wallet_transactions"]["Row"]["type"],
          title: transaction.title,
          subtitle: transaction.subtitle,
          amount: Number(transaction.amount),
          timestamp: transaction.created_at
        }))
      }))}
    />
  );
}
