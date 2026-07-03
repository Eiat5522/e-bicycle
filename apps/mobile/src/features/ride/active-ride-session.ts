import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Coordinates } from "@glide/shared";

const ACTIVE_RIDE_SESSION_STORAGE_KEY = "active_ride_session";

export interface ActiveRideBikeSnapshot {
  readonly id: string;
  readonly model: string;
  readonly location: string;
  readonly coordinates: Coordinates;
  readonly ratePerMinute?: number;
  readonly imageUrl?: string;
  readonly rideClass?: string;
  readonly estimatedRangeKm?: number;
  readonly topSpeedKmh?: number;
  readonly pricingLabel?: string;
  readonly status?: string;
  readonly activeRiderId?: string | null;
  readonly lastReportedAt?: string;
}

export interface ActiveRideSession {
  readonly bikeId: string;
  readonly startedAtMs: number;
  readonly route: readonly Coordinates[];
  readonly bike: ActiveRideBikeSnapshot;
}

function isCoordinate(value: unknown): value is Coordinates {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Coordinates).latitude === "number" &&
    typeof (value as Coordinates).longitude === "number"
  );
}

function isCoordinateArray(value: unknown): value is readonly Coordinates[] {
  return Array.isArray(value) && value.every((point) => isCoordinate(point));
}

function isActiveRideBikeSnapshot(value: unknown): value is ActiveRideBikeSnapshot {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ActiveRideBikeSnapshot).id === "string" &&
    typeof (value as ActiveRideBikeSnapshot).model === "string" &&
    typeof (value as ActiveRideBikeSnapshot).location === "string" &&
    isCoordinate((value as ActiveRideBikeSnapshot).coordinates)
  );
}

function toSession(value: unknown): ActiveRideSession | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const session = value as Partial<ActiveRideSession> & {
    readonly startedAt?: string;
  };

  const startedAtMs =
    typeof session.startedAtMs === "number"
      ? session.startedAtMs
      : typeof session.startedAt === "string"
        ? Date.parse(session.startedAt)
        : Number.NaN;

  if (
    typeof session.bikeId !== "string" ||
    !Number.isFinite(startedAtMs) ||
    !isCoordinateArray(session.route) ||
    !isActiveRideBikeSnapshot(session.bike)
  ) {
    return null;
  }

  return {
    bikeId: session.bikeId,
    startedAtMs,
    route: session.route,
    bike: session.bike
  };
}

export async function loadActiveRideSession() {
  try {
    const value = await AsyncStorage.getItem(ACTIVE_RIDE_SESSION_STORAGE_KEY);

    if (!value) {
      return null;
    }

    return toSession(JSON.parse(value));
  } catch (error) {
    console.error("Failed to load active ride session", error);
    return null;
  }
}

export async function saveActiveRideSession(session: ActiveRideSession) {
  try {
    await AsyncStorage.setItem(ACTIVE_RIDE_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.error("Failed to save active ride session", error);
  }
}

export async function clearActiveRideSession() {
  try {
    await AsyncStorage.removeItem(ACTIVE_RIDE_SESSION_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear active ride session", error);
  }
}

