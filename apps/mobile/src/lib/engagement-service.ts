import type { Coordinates } from "@glide/shared";

import { hasSupabaseConfig, supabase } from "./supabase";
import type { Database } from "./supabase.types";

type EngagementInsert =
  Database["public"]["Tables"]["user_engagement_aggregates"]["Insert"];
type EngagementRow =
  Database["public"]["Tables"]["user_engagement_aggregates"]["Row"];

export interface EngagementSummary {
  readonly profileId: string;
  readonly ecoPoints: number;
  readonly carbonReducedTotalKg: number;
  readonly caloriesBurnedTotal: number;
  readonly distanceAccumulatedKm: number;
  readonly lastUpdated: string | null | undefined;
}

export interface ConfiguredEngagementService {
  getEngagement(profileId?: string): Promise<EngagementSummary | undefined>;
  refreshOwnEngagement(): Promise<EngagementSummary | undefined>;
}

function mapRow(row: EngagementInsert): EngagementSummary {
  return {
    profileId: row.profile_id,
    ecoPoints: Number(row.eco_points),
    carbonReducedTotalKg: Number(row.carbon_reduced_total_kg),
    caloriesBurnedTotal: Number(row.calories_burned_total),
    distanceAccumulatedKm: Number(row.distance_accumulated_km),
    lastUpdated: row.last_updated ?? null
  };
}

async function getAuthenticatedUserId() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return session?.user.id ?? null;
}

function createSupabaseEngagementService(): ConfiguredEngagementService {
  return {
    async getEngagement(profileId) {
      const userId = profileId ?? (await getAuthenticatedUserId());

      if (!userId) {
        throw new Error("No active rider session was found.");
      }

      const { data, error } = await supabase
        .from("user_engagement_aggregates")
        .select(
          "profile_id, eco_points, carbon_reduced_total_kg, calories_burned_total, distance_accumulated_km, last_updated"
        )
        .eq("profile_id", userId)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch engagement: ${error.message}`);
      }

      return data ? mapRow(data) : undefined;
    },
    async refreshOwnEngagement() {
      const userId = await getAuthenticatedUserId();

      if (!userId) {
        throw new Error("No active rider session was found.");
      }

      const { data, error } = await supabase.rpc("refresh_user_engagement", {
        p_profile_id: userId
      } as never);

      if (error) {
        throw new Error(`Failed to refresh engagement: ${error.message}`);
      }

      if (typeof data !== "number" || data < 1) {
        return undefined;
      }

      return this.getEngagement(userId);
    }
  };
}

function createMockEngagementService(): ConfiguredEngagementService {
  const seed: EngagementInsert = {
    profile_id: "00000000-0000-0000-0000-000000000000",
    eco_points: 320,
    carbon_reduced_total_kg: 48.5,
    calories_burned_total: 2200,
    distance_accumulated_km: 44.2
  };

  const state: { row: EngagementInsert | null } = { row: seed };

  return {
    async getEngagement(profileId) {
      if (!profileId && !(await getAuthenticatedUserId())) {
        throw new Error("No active rider session was found.");
      }

      return state.row ? mapRow(state.row as EngagementRow) : undefined;
    },
    async refreshOwnEngagement() {
      const userId = (await getAuthenticatedUserId()) ?? seed.profile_id;
      state.row = { ...seed, profile_id: userId };
      return mapRow(state.row as EngagementRow);
    }
  };
}

export const configuredEngagementService: ConfiguredEngagementService =
  hasSupabaseConfig
    ? createSupabaseEngagementService()
    : createMockEngagementService();

export type { Coordinates };
