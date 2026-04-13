import { notFound } from "next/navigation";

import {
  BicycleEditor,
  type BikeRideHistoryEntry,
  type ManagedBike
} from "@/components/bicycle-management";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { deleteBikeAction, updateBikeAction } from "../actions";

function mapBike(row: {
  readonly created_at: string;
  readonly estimated_range_km: number;
  readonly id: string;
  readonly image_url: string | null;
  readonly last_reported_at: string;
  readonly latitude: number;
  readonly location: string;
  readonly longitude: number;
  readonly model: string;
  readonly pricing_label: string;
  readonly ride_class: string | null;
  readonly status: ManagedBike["status"];
  readonly top_speed_kmh: number;
  readonly updated_at: string;
}): ManagedBike {
  return {
    createdAt: row.created_at,
    estimatedRangeKm: row.estimated_range_km,
    id: row.id,
    imageUrl: row.image_url,
    lastReportedAt: row.last_reported_at,
    latitude: row.latitude,
    location: row.location,
    longitude: row.longitude,
    model: row.model,
    pricingLabel: row.pricing_label,
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
  readonly id: string;
  readonly payment_label: string;
  readonly route_label: string;
  readonly start_location: string;
  readonly started_at: string;
  readonly total_cost: number;
}): BikeRideHistoryEntry {
  return {
    co2SavedKg: row.co2_saved_kg,
    completedAt: row.completed_at,
    distanceKm: row.distance_km,
    durationSec: row.duration_sec,
    endLocation: row.end_location,
    id: row.id,
    paymentLabel: row.payment_label,
    routeLabel: row.route_label,
    startLocation: row.start_location,
    startedAt: row.started_at,
    totalCost: row.total_cost
  };
}

export default async function BicycleDetailPage({
  params
}: {
  readonly params: Promise<{ bikeId: string }>;
}) {
  await requireAdmin();

  const { bikeId } = await params;
  const supabase = await createClient();
  const [{ data: bike, error: bikeError }, { data: rideHistory, error: rideHistoryError }] =
    await Promise.all([
      supabase
        .from("bikes")
        .select(
          "id, model, ride_class, estimated_range_km, top_speed_kmh, pricing_label, status, location, latitude, longitude, last_reported_at, image_url, created_at, updated_at"
        )
        .eq("id", bikeId)
        .maybeSingle(),
      supabase
        .from("bike_ride_history")
        .select(
          "id, started_at, completed_at, duration_sec, distance_km, total_cost, co2_saved_kg, start_location, end_location, route_label, payment_label"
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

  return (
    <div className="flex flex-col gap-6">
      <BicycleEditor
        action={updateBikeAction}
        bike={mapBike(bike)}
        mode="edit"
        rideHistory={rideHistory.map(mapRideHistory)}
      />

      <form action={deleteBikeAction} className="flex justify-end">
        <input name="bikeId" type="hidden" value={bike.id} />
        <button
          className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700"
          type="submit">
          Delete Bicycle
        </button>
      </form>
    </div>
  );
}
