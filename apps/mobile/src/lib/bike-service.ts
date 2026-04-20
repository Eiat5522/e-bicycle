import type { Bike, NearbyBikesResult } from "@glide/shared";

import {
  bikeService,
  createHttpBikeService,
  getSeedBikeImageUrl,
  type BikeService
} from "@glide/api";

import { hasSupabaseConfig, supabase } from "./supabase";
import type { Database } from "./supabase.types";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const bikeDataSource = process.env.EXPO_PUBLIC_BIKE_DATA_SOURCE?.trim()?.toLowerCase();
const recoverableNetworkMessagePattern =
  /network request timed out|network request failed|failed to fetch|fetch failed|timed out/i;

type BikeRow = Database["public"]["Tables"]["bikes"]["Row"];

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
) {
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function mapBikeRow(row: BikeRow): Bike {
  return {
    id: row.id,
    model: row.model,
    ...(row.image_url
      ? { imageUrl: row.image_url }
      : getSeedBikeImageUrl(row.id)
        ? { imageUrl: getSeedBikeImageUrl(row.id) }
        : {}),
    ...(row.ride_class ? { rideClass: row.ride_class } : {}),
    estimatedRangeKm: row.estimated_range_km,
    topSpeedKmh: row.top_speed_kmh,
    pricingLabel: row.pricing_label,
    status: row.status,
    activeRiderId: row.active_rider_id,
    location: row.location,
    coordinates: {
      latitude: row.latitude,
      longitude: row.longitude
    },
    lastReportedAt: row.last_reported_at
  };
}

function createSupabaseBikeService(): BikeService {
  return {
    async listNearby(query) {
      const { data, error } = await supabase
        .from("bikes")
        .select(
          "id, model, image_url, ride_class, estimated_range_km, top_speed_kmh, pricing_label, status, active_rider_id, location, latitude, longitude, last_reported_at, created_at, updated_at"
        )
        .order("last_reported_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch nearby bikes: ${error.message}`);
      }

      const nearbyBikes = (data ?? [])
        .map(mapBikeRow)
        .filter(
          (bike: Bike) =>
            calculateDistanceMeters(
              { latitude: query.latitude, longitude: query.longitude },
              bike.coordinates
            ) <= query.radiusMeters
        );

      const limitedBikes =
        query.limit !== undefined ? nearbyBikes.slice(0, query.limit) : nearbyBikes;

      return {
        bikes: limitedBikes,
        serverTime: new Date().toISOString(),
        searchCenter: {
          latitude: query.latitude,
          longitude: query.longitude
        }
      } satisfies NearbyBikesResult;
    },
    async getById(id) {
      const { data, error } = await supabase
        .from("bikes")
        .select(
          "id, model, image_url, ride_class, estimated_range_km, top_speed_kmh, pricing_label, status, active_rider_id, location, latitude, longitude, last_reported_at, created_at, updated_at"
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch bike: ${error.message}`);
      }

      return data ? mapBikeRow(data) : undefined;
    }
  };
}

function shouldFallbackToMockBikes(error: unknown) {
  return error instanceof Error && recoverableNetworkMessagePattern.test(error.message);
}

function createResilientBikeService(primaryService: BikeService): BikeService {
  return {
    async listNearby(query) {
      try {
        return await primaryService.listNearby(query);
      } catch (error) {
        if (!shouldFallbackToMockBikes(error)) {
          throw error;
        }

        return bikeService.listNearby(query);
      }
    },
    async getById(id) {
      try {
        return await primaryService.getById(id);
      } catch (error) {
        if (!shouldFallbackToMockBikes(error)) {
          throw error;
        }

        return bikeService.getById(id);
      }
    }
  };
}

function createPrimaryBikeService(): BikeService {
  if (bikeDataSource === "mock") {
    return bikeService;
  }

  if (bikeDataSource === "api" && apiBaseUrl) {
    return createHttpBikeService({ baseUrl: apiBaseUrl });
  }

  if (bikeDataSource === "api" && !apiBaseUrl) {
    console.warn(
      "EXPO_PUBLIC_BIKE_DATA_SOURCE is set to \"api\" but EXPO_PUBLIC_API_BASE_URL is missing. Falling back to the next available bike data source."
    );
  }

  if (hasSupabaseConfig) {
    return createSupabaseBikeService();
  }

  if (apiBaseUrl) {
    return createHttpBikeService({ baseUrl: apiBaseUrl });
  }

  return bikeService;
}

const primaryBikeService: BikeService = createPrimaryBikeService();

export const configuredBikeService: BikeService =
  primaryBikeService === bikeService
    ? bikeService
    : createResilientBikeService(primaryBikeService);
