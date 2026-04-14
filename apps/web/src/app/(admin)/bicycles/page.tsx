import {
  BicycleManagementList,
  type ManagedBike
} from "@/components/bicycle-management";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

function mapBike(row: {
  readonly created_at: string;
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

export default async function BicyclesPage() {
  await requireAdmin();

  const supabase = await createClient();
  const [{ data: bikes, error: bikesError }, { data: rideHistory, error: rideHistoryError }] =
    await Promise.all([
      supabase
        .from("bikes")
        .select(
          "id, model, ride_class, top_speed_kmh, pricing_label, status, location, latitude, longitude, last_reported_at, image_url, created_at, updated_at"
        )
        .order("updated_at", { ascending: false }),
      supabase.from("bike_ride_history").select("bike_id")
    ]);

  if (bikesError) {
    throw new Error(bikesError.message);
  }

  if (rideHistoryError) {
    throw new Error(rideHistoryError.message);
  }

  const rideCounts = rideHistory.reduce<Record<string, number>>((accumulator, ride) => {
    accumulator[ride.bike_id] = (accumulator[ride.bike_id] ?? 0) + 1;
    return accumulator;
  }, {});

  return <BicycleManagementList bikes={bikes.map(mapBike)} rideCounts={rideCounts} />;
}
