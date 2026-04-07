import "server-only";

import type { BikeRow, ProfileRow } from "@glide/db";
import type { Bike, User } from "@glide/shared";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export function toBikeDto(row: BikeRow): Bike {
  const bike: Bike = {
    id: row.id,
    model: row.model,
    estimatedRangeKm: row.estimatedRangeKm,
    topSpeedKmh: row.topSpeedKmh,
    pricingLabel: row.pricingLabel,
    status: row.status,
    location: row.location,
    coordinates: {
      latitude: row.latitude,
      longitude: row.longitude
    },
    lastReportedAt: row.lastReportedAt.toISOString()
  };

  if (row.rideClass) {
    return {
      ...bike,
      rideClass: row.rideClass
    };
  }

  return bike;
}

export function toUserDto(profile: ProfileRow | undefined, authUser: SupabaseUser): User {
  return {
    id: authUser.id,
    firstName:
      profile?.firstName ??
      getStringMetadataValue(authUser.user_metadata.first_name) ??
      authUser.email?.split("@")[0] ??
      "Rider",
    email: profile?.email ?? authUser.email ?? ""
  };
}

function getStringMetadataValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}
