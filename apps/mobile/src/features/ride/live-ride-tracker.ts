import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  calculateRideRevenue,
  type Coordinates,
  type RideHistoryCheckpoint
} from "@glide/shared";

import { calculateDistanceKm } from "@/features/map/bike-distance";

const MIN_ROUTE_POINT_DISTANCE_KM = 0.015;
const MOCK_TICK_MS = 5000;
const DEFAULT_RATE_PER_MINUTE = 0.17;
const CO2_SAVED_KG_PER_KM = 0.24;
const LOCATION_DISTANCE_INTERVAL_METERS = 12;
const LOCATION_TIME_INTERVAL_MS = 5000;
const APPROACHING_DROPOFF_THRESHOLD_KM = 0.25;
const ARRIVED_DROPOFF_THRESHOLD_KM = 0.05;

export type LiveRideTrackingState = "starting" | "live" | "mock" | "permission_denied" | "error";

export interface LiveRideTrackerOptions {
  readonly bikeId: string;
  readonly startCoordinates?: Coordinates;
  readonly initialRoute?: readonly Coordinates[];
  readonly startedAtMs?: number;
  readonly ratePerMinute?: number;
  readonly startLocation?: string;
}

export interface LiveRideSnapshot {
  readonly bikeId: string;
  readonly startedAt: string;
  readonly durationSec: number;
  readonly distanceKm: number;
  readonly currentCost: number;
  readonly ratePerMinute: number;
  readonly co2SavedKg: number;
  readonly routeLabel: string;
  readonly startLocation: string;
  readonly endLocation: string;
  readonly route: readonly Coordinates[];
  readonly checkpoints: readonly RideHistoryCheckpoint[];
}

export type LiveRideCheckpoint = RideHistoryCheckpoint;

export interface DropoffZone {
  readonly id: string;
  readonly label: string;
  readonly coordinates: Coordinates;
  readonly distanceKm: number;
}

export type DropoffGuidanceState = "en_route" | "approaching" | "arrived";

export interface LiveRideDropoffGuidance {
  readonly zone: DropoffZone;
  readonly remainingDistanceKm: number;
  readonly state: DropoffGuidanceState;
}

export const DEFAULT_LIVE_RIDE_START_COORDINATES: Coordinates = {
  latitude: 13.7372,
  longitude: 100.5606
};

export const DROPOFF_ZONES = [
  {
    id: "benjakitti",
    label: "Benjakitti Park",
    coordinates: { latitude: 13.7319, longitude: 100.5459 }
  },
  {
    id: "lumphini-west",
    label: "Lumphini Park West Gate",
    coordinates: { latitude: 13.7305, longitude: 100.5418 }
  },
  {
    id: "silom-complex",
    label: "Silom Complex",
    coordinates: { latitude: 13.7286, longitude: 100.5345 }
  }
] as const;

function roundMetric(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeRoute(route: readonly Coordinates[]) {
  return route.length ? route : [DEFAULT_LIVE_RIDE_START_COORDINATES];
}

function createCheckpoint(
  id: string,
  label: string,
  description: string,
  coordinates: Coordinates,
  elapsedSec: number
): RideHistoryCheckpoint {
  return {
    id,
    label,
    description,
    coordinates,
    elapsedSec
  };
}

export function appendRoutePoint(
  route: readonly Coordinates[],
  nextPoint: Coordinates
): readonly Coordinates[] {
  const lastPoint = route.at(-1);

  if (!lastPoint) {
    return [nextPoint];
  }

  if (calculateDistanceKm(lastPoint, nextPoint) < MIN_ROUTE_POINT_DISTANCE_KM) {
    return route;
  }

  return [...route, nextPoint];
}

export function calculateRouteDistanceKm(route: readonly Coordinates[]) {
  return route.reduce((distanceKm, point, index) => {
    const previousPoint = route[index - 1];

    if (!previousPoint) {
      return distanceKm;
    }

    return distanceKm + calculateDistanceKm(previousPoint, point);
  }, 0);
}

export function createMockLiveRideRoute(
  startCoordinates = DEFAULT_LIVE_RIDE_START_COORDINATES,
  steps = 1
): readonly Coordinates[] {
  return Array.from({ length: steps + 1 }, (_, index) => ({
    latitude: roundMetric(startCoordinates.latitude - index * 0.0011, 7),
    longitude: roundMetric(startCoordinates.longitude - index * 0.00125, 7)
  }));
}

export function getNearestDropoffZone(coordinates: Coordinates): DropoffZone {
  const nearestZone = DROPOFF_ZONES.map((zone) => ({
    ...zone,
    distanceKm: calculateDistanceKm(coordinates, zone.coordinates)
  })).sort((leftZone, rightZone) => leftZone.distanceKm - rightZone.distanceKm)[0];

  if (!nearestZone) {
    throw new Error("At least one drop-off zone is required.");
  }

  return nearestZone;
}

export function getDropoffGuidance(coordinates: Coordinates): LiveRideDropoffGuidance {
  const zone = getNearestDropoffZone(coordinates);

  let state: DropoffGuidanceState = "en_route";

  if (zone.distanceKm <= ARRIVED_DROPOFF_THRESHOLD_KM) {
    state = "arrived";
  } else if (zone.distanceKm <= APPROACHING_DROPOFF_THRESHOLD_KM) {
    state = "approaching";
  }

  return {
    zone,
    remainingDistanceKm: zone.distanceKm,
    state
  };
}

export function createLiveRideSnapshot({
  bikeId,
  startedAtMs,
  nowMs,
  ratePerMinute = DEFAULT_RATE_PER_MINUTE,
  route,
  startLocation = "อโศก Interchange"
}: {
  readonly bikeId: string;
  readonly startedAtMs: number;
  readonly nowMs: number;
  readonly ratePerMinute?: number;
  readonly route: readonly Coordinates[];
  readonly startLocation?: string;
}): LiveRideSnapshot {
  const normalizedRoute = normalizeRoute(route);
  const durationSec = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  const distanceKm = roundMetric(calculateRouteDistanceKm(normalizedRoute));
  const currentCost = calculateRideRevenue({ durationSec, ratePerMinute });
  const co2SavedKg = roundMetric(distanceKm * CO2_SAVED_KG_PER_KM, 1);
  const startPoint = normalizedRoute[0] ?? DEFAULT_LIVE_RIDE_START_COORDINATES;
  const endPoint = normalizedRoute.at(-1) ?? startPoint;
  const nearestDropoff = getNearestDropoffZone(endPoint);

  return {
    bikeId,
    startedAt: new Date(startedAtMs).toISOString(),
    durationSec,
    distanceKm,
    currentCost,
    ratePerMinute,
    co2SavedKg,
    routeLabel: `${startLocation} to ${nearestDropoff.label}`,
    startLocation,
    endLocation: nearestDropoff.label,
    route: normalizedRoute,
    checkpoints: [
      createCheckpoint(
        `${bikeId}-unlock`,
        "Unlock",
        "Bike unlocked and live ride tracking started.",
        startPoint,
        0
      ),
      createCheckpoint(
        `${bikeId}-dropoff`,
        "Drop-off",
        `Nearest suggested drop-off is ${nearestDropoff.label}.`,
        endPoint,
        durationSec
      )
    ]
  };
}

export function useLiveRideTracker({
  bikeId,
  startCoordinates = DEFAULT_LIVE_RIDE_START_COORDINATES,
  initialRoute,
  startedAtMs,
  ratePerMinute = DEFAULT_RATE_PER_MINUTE,
  startLocation = "อโศก Interchange"
}: LiveRideTrackerOptions) {
  const startLatitude = startCoordinates.latitude;
  const startLongitude = startCoordinates.longitude;
  const stableStartCoordinates = useMemo(
    () => ({
      latitude: startLatitude,
      longitude: startLongitude
    }),
    [startLatitude, startLongitude]
  );
  const resolvedInitialRoute = useMemo(
    () => (initialRoute && initialRoute.length > 0 ? initialRoute : [stableStartCoordinates]),
    [initialRoute, stableStartCoordinates]
  );
  const startedAtMsRef = useRef(startedAtMs ?? Date.now());
  const [nowMs, setNowMs] = useState(startedAtMsRef.current);
  const [route, setRoute] = useState<readonly Coordinates[]>(resolvedInitialRoute);
  const [trackingState, setTrackingState] = useState<LiveRideTrackingState>("starting");
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const mockStepRef = useRef(0);

  const addRoutePoint = useCallback((coordinates: Coordinates) => {
    setRoute((currentRoute) => appendRoutePoint(currentRoute, coordinates));
    setNowMs(Date.now());
  }, []);

  useEffect(() => {
    const nextStartedAtMs = startedAtMs ?? Date.now();

    setRoute(resolvedInitialRoute);
    setTrackingState("starting");
    setWarningMessage(null);
    mockStepRef.current = 0;
    startedAtMsRef.current = nextStartedAtMs;
    setNowMs(startedAtMsRef.current);
  }, [bikeId, resolvedInitialRoute, startedAtMs, stableStartCoordinates]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    let locationSubscription: Location.LocationSubscription | undefined;
    let mockInterval: ReturnType<typeof setInterval> | undefined;

    function startMockTracking(message: string, state: LiveRideTrackingState) {
      if (!isMounted) {
        return;
      }

      setTrackingState(state);
      setWarningMessage(message);
      setRoute(createMockLiveRideRoute(stableStartCoordinates, 1));

      mockInterval = setInterval(() => {
        mockStepRef.current += 1;
        setRoute(createMockLiveRideRoute(stableStartCoordinates, mockStepRef.current + 1));
        setNowMs(Date.now());
      }, MOCK_TICK_MS);
    }

    async function startTracking() {
      if (process.env.NODE_ENV === "test" || process.env.EXPO_OS === "web") {
        startMockTracking("Using simulated ride tracking for this environment.", "mock");
        return;
      }

      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (!permission.granted) {
          startMockTracking("Location permission is off. Using simulated ride tracking.", "permission_denied");
          return;
        }

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: LOCATION_DISTANCE_INTERVAL_METERS,
            timeInterval: LOCATION_TIME_INTERVAL_MS
          },
          (position) => {
            addRoutePoint({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          }
        );

        if (isMounted) {
          setTrackingState("live");
          setWarningMessage(null);
        }
      } catch {
        startMockTracking("Live GPS tracking could not start. Using simulated ride tracking.", "error");
      }
    }

    void startTracking();

    return () => {
      isMounted = false;
      locationSubscription?.remove();

      if (mockInterval) {
        clearInterval(mockInterval);
      }
    };
  }, [addRoutePoint, stableStartCoordinates]);

  const snapshot = useMemo(
    () =>
      createLiveRideSnapshot({
        bikeId,
        startedAtMs: startedAtMsRef.current,
        nowMs,
        ratePerMinute,
        route,
        startLocation
      }),
    [bikeId, nowMs, ratePerMinute, route, startLocation]
  );
  const currentPoint = snapshot.route.at(-1) ?? stableStartCoordinates;
  const dropoffGuidance = useMemo(() => getDropoffGuidance(currentPoint), [currentPoint]);

  return {
    snapshot,
    trackingState,
    warningMessage,
    nearestDropoff: dropoffGuidance.zone,
    dropoffGuidance
  };
}
