import type { Coordinates } from "@glide/shared";

import { hasSupabaseConfig, supabase } from "./supabase";
import type { Database } from "./supabase.types";

type ServiceAreaRow =
  Database["public"]["Tables"]["service_areas"]["Row"];

export interface ServiceArea {
  readonly id: string;
  readonly zoneName: string | null;
  readonly cityName: string | null;
  readonly status: string | null;
}

export interface GeofenceCheckResult {
  readonly inside: boolean;
  readonly serviceArea: ServiceArea | null;
}

export interface ConfiguredGeofenceService {
  check(latitude: number, longitude: number): Promise<GeofenceCheckResult>;
}

function mapServiceArea(
  row: Pick<
    ServiceAreaRow,
    "id" | "zone_name" | "city_name" | "status"
  >
): ServiceArea {
  return {
    id: row.id,
    zoneName: row.zone_name,
    cityName: row.city_name,
    status: row.status
  };
}

function createSupabaseGeofenceService(): ConfiguredGeofenceService {
  return {
    async check(latitude, longitude) {
      if (typeof latitude !== "number" || typeof longitude !== "number") {
        throw new Error("latitude and longitude are required numbers.");
      }

      const { data, error } = await supabase.rpc("check_service_area", {
        p_latitude: latitude,
        p_longitude: longitude
      } as never);

      if (error) {
        throw new Error(`Geofence check failed: ${error.message}`);
      }

      const area = data as
        | Pick<
            ServiceAreaRow,
            "id" | "zone_name" | "city_name" | "status"
          >
        | null;
      const inside = area !== null;

      return {
        inside,
        serviceArea: inside ? mapServiceArea(area) : null
      };
    }
  };
}

function createMockGeofenceService(): ConfiguredGeofenceService {
  const bangkokCenter: Coordinates = {
    latitude: 13.7563,
    longitude: 100.5018
  };

  return {
    async check(latitude, longitude) {
      const distanceKm =
        Math.abs(latitude - bangkokCenter.latitude) +
        Math.abs(longitude - bangkokCenter.longitude);

      const inside = distanceKm < 0.5;

      return {
        inside,
        serviceArea: inside
          ? {
              id: "zone-mock",
              zoneName: "Bangkok Central",
              cityName: "Bangkok",
              status: "active"
            }
          : null
      };
    }
  };
}

export const configuredGeofenceService: ConfiguredGeofenceService =
  hasSupabaseConfig
    ? createSupabaseGeofenceService()
    : createMockGeofenceService();
