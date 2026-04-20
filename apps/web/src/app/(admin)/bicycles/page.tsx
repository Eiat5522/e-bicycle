import {
  BicycleManagementList,
  type ManagedBike
} from "@/components/bicycle-management";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

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
    rideClass: row.ride_class,
    status: row.status,
    topSpeedKmh: row.top_speed_kmh,
    updatedAt: row.updated_at
  };
}

export default async function BicyclesPage() {
  await requireAdmin();

  const supabase = await createClient();
  const [
    { data: bikes, error: bikesError },
    { data: rideHistory, error: rideHistoryError }
  ] =
    await Promise.all([
      supabase
        .from("bikes")
        .select(
          "id, model, ride_class, top_speed_kmh, pricing_label, status, active_rider_id, location, latitude, longitude, last_reported_at, image_url, created_at, updated_at"
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

  const activeRiderIds = bikes
    .map((bike) => bike.active_rider_id)
    .filter((activeRiderId): activeRiderId is string => Boolean(activeRiderId));

  const { data: riders } = activeRiderIds.length
    ? await supabase.from("profiles").select("id, first_name").in("id", activeRiderIds)
    : { data: [] as { id: string; first_name: string }[] };

  const riderNameById = Object.fromEntries(
    (riders ?? []).map((rider) => [rider.id, rider.first_name])
  );

  const bikesWithRiders = bikes.map((bike) => ({
    ...mapBike(bike),
    activeRiderLabel: mapActiveRiderLabel(bike.active_rider_id, riderNameById)
  }));

  return <BicycleManagementList bikes={bikesWithRiders} rideCounts={rideCounts} />;
}
