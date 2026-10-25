import { inventoryContractVersion, isCanonicalBikeStatus, projectUnsupportedInventory, type BikeInventory, type InventoryResult } from "@glide/shared";
import type { Bike, NearbyBikesQuery, NearbyBikesResult } from "@glide/shared";

import {
  bikeService,
  createHttpBikeService,
  createHttpInventoryService,
  getSeedBikeImageUrl,
  type BikeService
} from "@glide/api";

import { hasSupabaseConfig, supabase } from "./supabase";
import type { Database } from "./supabase.types";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const bikeDataSource = process.env.EXPO_PUBLIC_BIKE_DATA_SOURCE?.trim()?.toLowerCase();

type BikeRow = Pick<
  Database["public"]["Tables"]["bikes"]["Row"],
  | "active_rider_id"
  | "active_ride_start_location"
  | "active_ride_started_at"
  | "created_at"
  | "estimated_range_km"
  | "id"
  | "image_url"
  | "last_reported_at"
  | "latitude"
  | "location"
  | "longitude"
  | "model"
  | "pricing_label"
  | "rate_per_minute"
  | "ride_class"
  | "status"
  | "top_speed_kmh"
  | "updated_at"
>;

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
  // Do not silently translate an unresolved historical enum into rentable state.
  if (!isCanonicalBikeStatus(row.status)) {
    throw new Error("Bike status schema requires reconciliation.");
  }
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
    ratePerMinute: Number(row.rate_per_minute),
    status: row.status,
    activeRiderId: row.active_rider_id,
    activeRideStartedAt: row.active_ride_started_at,
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
          "id, model, image_url, ride_class, estimated_range_km, top_speed_kmh, pricing_label, rate_per_minute, status, active_rider_id, active_ride_started_at, active_ride_start_location, location, latitude, longitude, last_reported_at, created_at, updated_at"
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
          "id, model, image_url, ride_class, estimated_range_km, top_speed_kmh, pricing_label, rate_per_minute, status, active_rider_id, active_ride_started_at, active_ride_start_location, location, latitude, longitude, last_reported_at, created_at, updated_at"
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

interface InventoryService {
  listNearby(query: NearbyBikesQuery): Promise<InventoryResult>;
  getById(id: string): Promise<BikeInventory | undefined>;
}

function mapInventoryRow(row: BikeRow): BikeInventory {
  if (isCanonicalBikeStatus(row.status)) return { kind: "supported", bike: mapBikeRow(row) };
  return projectUnsupportedInventory({
    id: row.id, rawStatus: row.status, model: row.model, location: row.location,
    coordinates: { latitude: row.latitude, longitude: row.longitude },
    lastReportedAt: row.last_reported_at, activeRideStartedAt: row.active_ride_started_at,
  });
}

const inventoryColumns = "id, model, image_url, ride_class, estimated_range_km, top_speed_kmh, pricing_label, rate_per_minute, status, active_rider_id, active_ride_started_at, active_ride_start_location, location, latitude, longitude, last_reported_at, created_at, updated_at";

/** Versioned reads never recover database/auth/network errors with synthetic stock. */
const supabaseInventoryService: InventoryService = {
  async listNearby(query) {
    const { data, error } = await supabase.from("bikes").select(inventoryColumns).order("last_reported_at", { ascending: false });
    if (error) throw new Error(`Failed to fetch nearby bikes: ${error.message}`);
    const scoped = (data ?? []).filter((row) => calculateDistanceMeters(query, row) <= query.radiusMeters);
    const limited = query.limit === undefined ? scoped : scoped.slice(0, query.limit);
    const inventory = limited.map(mapInventoryRow);
    return {
      contractVersion: inventoryContractVersion, inventory,
      totalCount: scoped.length, unsupportedCount: scoped.filter((row) => !isCanonicalBikeStatus(row.status)).length,
      returnedCount: inventory.length, returnedUnsupportedCount: inventory.filter((row) => row.kind === "unsupported").length,
      serverTime: new Date().toISOString(), searchCenter: { latitude: query.latitude, longitude: query.longitude },
    };
  },
  async getById(id) {
    const { data, error } = await supabase.from("bikes").select(inventoryColumns).eq("id", id).maybeSingle();
    if (error) throw new Error(`Failed to fetch bike: ${error.message}`);
    return data ? mapInventoryRow(data) : undefined;
  },
};

const mockInventoryService: InventoryService = {
  async listNearby(query) {
    const result = await bikeService.listNearby({ latitude: query.latitude, longitude: query.longitude, radiusMeters: query.radiusMeters });
    const selected = query.limit === undefined ? result.bikes : result.bikes.slice(0, query.limit);
    return { contractVersion: inventoryContractVersion, inventory: selected.map((bike) => ({ kind: "supported" as const, bike })), totalCount: result.bikes.length, unsupportedCount: 0, returnedCount: selected.length, returnedUnsupportedCount: 0, serverTime: result.serverTime, ...(result.searchCenter ? { searchCenter: result.searchCenter } : {}) };
  },
  async getById(id) {
    const bike = await bikeService.getById(id);
    return bike ? { kind: "supported", bike } : undefined;
  }
};

export const configuredInventoryService: InventoryService =
  bikeDataSource === "mock" ? mockInventoryService :
  bikeDataSource === "api" && apiBaseUrl ? createHttpInventoryService({ baseUrl: apiBaseUrl }) :
  hasSupabaseConfig ? supabaseInventoryService :
  apiBaseUrl ? createHttpInventoryService({ baseUrl: apiBaseUrl }) : mockInventoryService;

/** Canonical legacy consumers fail closed instead of silently receiving mock stock. */
export const configuredBikeService: BikeService = createPrimaryBikeService();
