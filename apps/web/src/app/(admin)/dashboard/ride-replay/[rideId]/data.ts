import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { RideReplayDetailViewModel } from "@/components/ride-replay-detail";

type RideReplayRow = {
  readonly bike_id: string;
  readonly billable_minutes: number;
  readonly checkpoints: unknown;
  readonly co2_saved_kg: number;
  readonly completed_at: string;
  readonly currency_code: string;
  readonly distance_km: number;
  readonly duration_sec: number;
  readonly end_location: string;
  readonly fare_calculation_method: string;
  readonly id: string;
  readonly payment_label: string;
  readonly profile_id: string | null;
  readonly rate_per_minute: number;
  readonly route: unknown;
  readonly route_label: string;
  readonly start_location: string;
  readonly started_at: string;
  readonly total_cost: number;
  readonly wallet_transaction_id: string | null;
};

function normalizeArray<T>(value: unknown): readonly T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function mapRideReplay(
  ride: RideReplayRow,
  bike: { readonly model: string } | null,
  rider: { readonly first_name: string } | null
): RideReplayDetailViewModel {
  return {
    bikeId: ride.bike_id,
    bikeModel: bike?.model ?? "Unknown bike",
    billableMinutes: ride.billable_minutes,
    checkpoints: normalizeArray<RideReplayDetailViewModel["checkpoints"][number]>(ride.checkpoints),
    co2SavedKg: Number(ride.co2_saved_kg),
    completedAt: ride.completed_at,
    currencyCode: ride.currency_code,
    distanceKm: Number(ride.distance_km),
    dropOffContext: ride.end_location,
    durationSec: ride.duration_sec,
    endLocation: ride.end_location,
    fareCalculationMethod: ride.fare_calculation_method,
    id: ride.id,
    paymentLabel: ride.payment_label,
    profileId: ride.profile_id,
    ratePerMinute: Number(ride.rate_per_minute),
    riderLabel: rider?.first_name ?? null,
    route: normalizeArray<RideReplayDetailViewModel["route"][number]>(ride.route),
    routeLabel: ride.route_label,
    startLocation: ride.start_location,
    startedAt: ride.started_at,
    totalCost: Number(ride.total_cost),
    walletTransactionId: ride.wallet_transaction_id
  };
}

export async function getRideReplayDetail(rideId: string): Promise<RideReplayDetailViewModel> {
  await requireAdmin();

  const supabase = await createClient();
  const { data: ride, error: rideError } = await supabase
    .from("rental_transactions")
    .select(
      "id, bike_id, profile_id, started_at, completed_at, duration_sec, distance_km, total_cost, rate_per_minute, billable_minutes, currency_code, wallet_transaction_id, fare_calculation_method, co2_saved_kg, start_location, end_location, route_label, payment_label, route, checkpoints"
    )
    .eq("id", rideId)
    .maybeSingle();

  if (rideError) {
    throw new Error(rideError.message);
  }

  if (!ride) {
    notFound();
  }

  const [{ data: bike, error: bikeError }, { data: rider, error: riderError }] = await Promise.all([
    supabase.from("bikes").select("id, model, location, ride_class").eq("id", ride.bike_id).maybeSingle(),
    ride.profile_id
      ? supabase.from("profiles").select("id, first_name").eq("id", ride.profile_id).maybeSingle()
      : { data: null as { first_name: string } | null, error: null }
  ]);

  if (bikeError) {
    throw new Error(bikeError.message);
  }

  if (riderError) {
    console.error("Failed to load rider profile for ride replay", {
      rideId,
      errorCode: riderError.code,
      errorMessage: riderError.message
    });
  }

  return mapRideReplay(
    ride as RideReplayRow,
    bike as { readonly model: string } | null,
    riderError ? null : (rider as { readonly first_name: string } | null)
  );
}
