import "server-only";

import { bikes, getDb, profiles } from "@glide/db";
import type { NearbyBikesQuery, NearbyBikesResult, User } from "@glide/shared";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { asc, eq, sql } from "drizzle-orm";

import { toBikeDto, toUserDto } from "./dto";

export async function getCurrentUserDto(authUser: SupabaseUser): Promise<User> {
  const [profile] = await getDb()
    .select()
    .from(profiles)
    .where(eq(profiles.id, authUser.id))
    .limit(1);

  return toUserDto(profile, authUser);
}

export async function getNearbyBikesDto(query: NearbyBikesQuery): Promise<NearbyBikesResult> {
  const radiusKm = query.radiusMeters / 1000;
  const distanceKm = sql<number>`(
    6371 * acos(
      least(
        1,
        greatest(
          -1,
          cos(radians(${query.latitude})) *
          cos(radians(${bikes.latitude})) *
          cos(radians(${bikes.longitude}) - radians(${query.longitude})) +
          sin(radians(${query.latitude})) *
          sin(radians(${bikes.latitude}))
        )
      )
    )
  )`;

  const rows = await getDb()
    .select()
    .from(bikes)
    .where(sql`${distanceKm} <= ${radiusKm}`)
    .orderBy(asc(distanceKm))
    .limit(query.limit ?? 50);

  return {
    bikes: rows.map(toBikeDto),
    serverTime: new Date().toISOString(),
    searchCenter: {
      latitude: query.latitude,
      longitude: query.longitude
    }
  };
}

export async function getBikeDto(id: string) {
  const [bike] = await getDb().select().from(bikes).where(eq(bikes.id, id)).limit(1);

  return bike ? toBikeDto(bike) : undefined;
}
