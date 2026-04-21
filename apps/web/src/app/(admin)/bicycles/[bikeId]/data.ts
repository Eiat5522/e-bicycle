import { notFound } from "next/navigation";

import {
  type BikeRideHistoryEntry,
  type ManagedBike
} from "@/components/bicycle-management";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function mapActiveRiderLabel(
  activeRiderId: string | null,
  profileMap: Readonly<Record<string, string>>
) {
  if (!activeRiderId) {
    return null;
  }

  return profileMap[activeRiderId] ?? null;
}

function mapBike(row: {
  readonly created_at: string;
  readonly id: string;
  readonly active_rider_id: string | null;
  readonly image_url: string | null;
  readonly last_reported_at: string;
  readonly latitude: number;
  readonly location: string;
  readonly longitude: number;
  readonly model: string;
  readonly pricing_label: string;
  readonly rate_per_minute: number;
  readonly ride_class: string | null;
  readonly status: ManagedBike["status"];
  readonly top_speed_kmh: number;
  readonly updated_at: string;
}): ManagedBike {
  return {
    createdAt: row.created_at,
    activeRiderId: row.active_rider_id,
    activeRiderLabel: null,
    id: row.id,
    imageUrl: row.image_url,
    lastReportedAt: row.last_reported_at,
    latitude: row.latitude,
    location: row.location,
    longitude: row.longitude,
    model: row.model,
    pricingLabel: row.pricing_label,
    ratePerMinute: Number(row.rate_per_minute),
    rideClass: row.ride_class,
    status: row.status,
    topSpeedKmh: row.top_speed_kmh,
    updatedAt: row.updated_at
  };
}

function mapRideHistory(row: {
  readonly co2_saved_kg: number;
  readonly completed_at: string;
  readonly distance_km: number;
  readonly duration_sec: number;
  readonly end_location: string;
  readonly fare_calculation_method: string;
  readonly id: string;
  readonly payment_label: string;
  readonly rate_per_minute: number;
  readonly route_label: string;
  readonly start_location: string;
  readonly started_at: string;
  readonly total_cost: number;
  readonly billable_minutes: number;
  readonly currency_code: string;
  readonly wallet_transaction_id: string | null;
}): BikeRideHistoryEntry {
  return {
    co2SavedKg: row.co2_saved_kg,
    completedAt: row.completed_at,
    distanceKm: row.distance_km,
    durationSec: row.duration_sec,
    endLocation: row.end_location,
    fareCalculationMethod: row.fare_calculation_method,
    id: row.id,
    paymentLabel: row.payment_label,
    ratePerMinute: Number(row.rate_per_minute),
    routeLabel: row.route_label,
    startLocation: row.start_location,
    startedAt: row.started_at,
    totalCost: row.total_cost,
    billableMinutes: row.billable_minutes,
    currencyCode: row.currency_code,
    walletTransactionId: row.wallet_transaction_id
  };
}

export async function getBikeDetail(bikeId: string) {
  await requireAdmin();

  const supabase = await createClient();
  const [{ data: bike, error: bikeError }, { data: rideHistory, error: rideHistoryError }] =
    await Promise.all([
      supabase
        .from("bikes")
        .select(
          "id, model, ride_class, top_speed_kmh, pricing_label, rate_per_minute, status, active_rider_id, location, latitude, longitude, last_reported_at, image_url, created_at, updated_at"
        )
        .eq("id", bikeId)
        .maybeSingle(),
      supabase
        .from("bike_ride_history")
        .select(
          "id, started_at, completed_at, duration_sec, distance_km, total_cost, rate_per_minute, billable_minutes, currency_code, wallet_transaction_id, fare_calculation_method, co2_saved_kg, start_location, end_location, route_label, payment_label"
        )
        .eq("bike_id", bikeId)
        .order("completed_at", { ascending: false })
    ]);

  if (bikeError) {
    throw new Error(bikeError.message);
  }

  if (rideHistoryError) {
    throw new Error(rideHistoryError.message);
  }

  if (!bike) {
    notFound();
  }

  const riderResult = bike.active_rider_id
    ? await supabase
        .from("profiles")
        .select("id, first_name")
        .eq("id", bike.active_rider_id)
        .maybeSingle()
    : { data: null as { id: string; first_name: string } | null, error: null };

  if (riderResult.error) {
    console.error("Failed to load rider profile for bike detail", {
      bikeId,
      activeRiderId: bike.active_rider_id,
      error: riderResult.error
    });
  }

  const rider = riderResult.error ? null : riderResult.data;

  return {
    bike: {
      ...mapBike(bike),
      activeRiderLabel: mapActiveRiderLabel(bike.active_rider_id, rider ? { [rider.id]: rider.first_name } : {})
    },
    rideHistory: rideHistory.map(mapRideHistory)
  };
}
