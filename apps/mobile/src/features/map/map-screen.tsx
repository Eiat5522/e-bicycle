import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, ScrollView, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getSeedBikeImageUrl } from "@glide/api";
import type { Coordinates, NearbyBikesResult } from "@glide/shared";
import { formatDistanceKm } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { SurfaceCard } from "@/components/surface-card";
import { useAuth } from "@/features/auth/auth-provider";
import { configuredBikeService } from "@/lib/bike-service";
import { colors, spacing } from "@/theme/tokens";

import { calculateDistanceKm, sortBikesByDistance } from "./bike-distance";
import { BikeMarkerDrawer } from "./bike-marker-drawer";
import { MapCanvas } from "./map-canvas";
import { useRideSession } from "../ride/ride-session-context";

export const DEFAULT_NEARBY_RADIUS_METERS = 1500;
export const EXPANDED_NEARBY_RADIUS_METERS = 8000;
export const MAP_POLL_INTERVAL_MS = 15000;
export const DEFAULT_MAP_COORDINATES = {
  latitude: 13.7563,
  longitude: 100.5018
} as const;

type LoadState = "loading" | "ready" | "permission_denied" | "error";

export function MapScreen() {
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { bikeRideOverrides } = useRideSession();
  const currentUserId = user?.id ?? null;
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [userCoordinates, setUserCoordinates] = useState<Coordinates>();
  const [nearbyResult, setNearbyResult] = useState<NearbyBikesResult>();
  const [selectedBikeId, setSelectedBikeId] = useState<string>();
  const [drawerBikeId, setDrawerBikeId] = useState<string>();
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const fetchNearbyBikes = useCallback(async (coordinates: Coordinates) => {
    const primaryResult = await configuredBikeService.listNearby({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      radiusMeters: DEFAULT_NEARBY_RADIUS_METERS,
      limit: 50
    });

    if (primaryResult.bikes.length > 0) {
      return { result: primaryResult };
    }

    const expandedResult = await configuredBikeService.listNearby({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      radiusMeters: EXPANDED_NEARBY_RADIUS_METERS,
      limit: 50
    });

    if (expandedResult.bikes.length === 0) {
      return { result: primaryResult };
    }

    return {
      result: expandedResult,
      notice: "No bikes nearby yet. Showing the closest bikes from a wider area."
    };
  }, []);

  const loadNearbyBikes = useCallback(
    async (coordinates: Coordinates) => {
      const { result, notice } = await fetchNearbyBikes(coordinates);

      setNearbyResult(result);
      setSelectedBikeId((currentId) => currentId ?? result.bikes[0]?.id);
      setDrawerBikeId((currentId) =>
        currentId && result.bikes.some((bike) => bike.id === currentId) ? currentId : undefined
      );
      setLoadState("ready");
      setErrorMessage(undefined);
      return notice;
    },
    [fetchNearbyBikes]
  );

  const requestLocationAndLoad = useCallback(async () => {
    setLoadState("loading");

    const permission = await Location.requestForegroundPermissionsAsync();

    if (!permission.granted) {
      setLoadState("permission_denied");
      setErrorMessage("Location permission is required to show bikes near you.");
      return;
    }

    try {
      let coordinates: Coordinates;

      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });

        coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
      } catch {
        const lastKnownPosition = await Location.getLastKnownPositionAsync();

        if (lastKnownPosition) {
          coordinates = {
            latitude: lastKnownPosition.coords.latitude,
            longitude: lastKnownPosition.coords.longitude
          };
        } else {
          coordinates = DEFAULT_MAP_COORDINATES;
        }
      }

      setUserCoordinates(coordinates);
      await loadNearbyBikes(coordinates);
    } catch (error) {
      setLoadState("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not determine your current location."
      );
    }
  }, [loadNearbyBikes]);

  useEffect(() => {
    void requestLocationAndLoad();
  }, [requestLocationAndLoad]);

  useEffect(() => {
    if (!isFocused || !userCoordinates) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      void loadNearbyBikes(userCoordinates)
        .then(() => undefined)
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : "Failed to refresh nearby bikes.";

          setErrorMessage(message);

          if (!nearbyResult) {
            setLoadState("error");
            return;
          }
        });
    }, MAP_POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isFocused, loadNearbyBikes, nearbyResult, userCoordinates]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && userCoordinates) {
        void loadNearbyBikes(userCoordinates)
          .then(() => undefined)
          .catch((error: unknown) => {
            const message =
              error instanceof Error ? error.message : "Failed to refresh nearby bikes.";

            setErrorMessage(message);

            if (!nearbyResult) {
              setLoadState("error");
              return;
            }
          });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadNearbyBikes, nearbyResult, userCoordinates]);

  const handlePressMarker = useCallback(
    (bikeId: string, status: NearbyBikesResult["bikes"][number]["status"], activeRiderId: string | null) => {
      if (status === "in_use" && activeRiderId === currentUserId) {
        router.push({
          pathname: "/ride/active",
          params: {
            bikeId
          }
        });
        return;
      }

      setSelectedBikeId(bikeId);
      setDrawerBikeId(bikeId);
    },
    [currentUserId, router]
  );

  const handleRecenterToCurrentLocation = useCallback(async () => {
    try {
      let coordinates: Coordinates;

      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });

        coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
      } catch {
        const lastKnownPosition = await Location.getLastKnownPositionAsync();

        if (lastKnownPosition) {
          coordinates = {
            latitude: lastKnownPosition.coords.latitude,
            longitude: lastKnownPosition.coords.longitude
          };
        } else {
          coordinates = DEFAULT_MAP_COORDINATES;
        }
      }

      setUserCoordinates(coordinates);
      await loadNearbyBikes(coordinates);
    } catch {}
  }, [loadNearbyBikes]);

  const bikesWithSeedImages = useMemo(
    () =>
      (nearbyResult?.bikes ?? []).map((bike) => ({
        ...bike,
        imageUrl: bike.imageUrl ?? getSeedBikeImageUrl(bike.id),
        status: bikeRideOverrides[bike.id]?.status ?? bike.status,
        activeRiderId: bikeRideOverrides[bike.id]?.activeRiderId ?? bike.activeRiderId ?? null
      })),
    [bikeRideOverrides, nearbyResult?.bikes]
  );

  const sortedBikes = useMemo(
    () => sortBikesByDistance(bikesWithSeedImages, userCoordinates),
    [bikesWithSeedImages, userCoordinates]
  );

  const bikeDistanceLabels = useMemo(() => {
    if (!userCoordinates) {
      return {};
    }

    return Object.fromEntries(
      sortedBikes.map((bike) => [
        bike.id,
        `${formatDistanceKm(calculateDistanceKm(userCoordinates, bike.coordinates))} away`
      ])
    );
  }, [sortedBikes, userCoordinates]);

  const drawerBike = useMemo(
    () => sortedBikes.find((bike) => bike.id === drawerBikeId),
    [drawerBikeId, sortedBikes]
  );
  const isDrawerBikeOwnedByCurrentUser =
    drawerBike?.status === "in_use" && drawerBike.activeRiderId === currentUserId;
  const isDrawerBikeUnlockable = drawerBike?.status === "available";
  const drawerStatusMessage = drawerBike
    ? isDrawerBikeOwnedByCurrentUser
      ? "Your active ride"
      : drawerBike.status === "in_use"
        ? "Currently in use by another rider"
        : drawerBike.status === "maintenance"
          ? "Under maintenance"
          : drawerBike.status === "reserved"
            ? "Reserved"
        : "Ready to rent"
    : undefined;
  const drawerUnlockDisabledMessage = drawerBike
    ? drawerBike.status === "maintenance"
      ? "This bike is under maintenance and cannot be unlocked."
      : drawerBike.status === "reserved"
        ? "This bike is reserved and cannot be unlocked right now."
        : "This bike is currently in use by another rider."
    : undefined;
  const mapCenter = nearbyResult?.searchCenter ?? userCoordinates;

  const drawer = (
    <BikeMarkerDrawer
      bike={drawerBike}
      distanceLabel={drawerBike ? bikeDistanceLabels[drawerBike.id] : undefined}
      canUnlock={Boolean(isDrawerBikeUnlockable)}
      statusMessage={drawerStatusMessage}
      unlockDisabledMessage={drawerUnlockDisabledMessage}
      visible={Boolean(drawerBike)}
      onClose={() => setDrawerBikeId(undefined)}
      onHelp={() => {
        setDrawerBikeId(undefined);
        router.push("/help");
      }}
      onUnlock={() => {
        if (!drawerBike) {
          return;
        }

        setDrawerBikeId(undefined);
        router.push(`/unlock/${drawerBike.id}`);
      }}
      onViewDetails={() => {
        if (!drawerBike) {
          return;
        }

        setDrawerBikeId(undefined);
        router.push(`/bike/${drawerBike.id}`);
      }}
    />
  );

  if (loadState === "ready") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flex: 1,
            marginTop: -insets.top
          }}
        >
          <MapCanvas
            bikes={sortedBikes}
            bikeDistanceLabels={bikeDistanceLabels}
            currentUserId={currentUserId}
            mapCenter={mapCenter}
            onRecenter={() => void handleRecenterToCurrentLocation()}
            selectedBikeId={selectedBikeId}
            userCoordinates={userCoordinates}
            onPressMarker={handlePressMarker}
          />

          {!sortedBikes.length ? (
            <View
              style={{
                bottom: spacing.xxl * 2,
                left: spacing.lg,
                position: "absolute",
                right: spacing.lg
              }}
            >
              <SurfaceCard>
                <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                  No bikes nearby right now
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                  Try refreshing in a moment or moving to a busier pickup area.
                </Text>
                <PrimaryButton
                  label="Refresh Nearby Bikes"
                  onPress={() => void requestLocationAndLoad()}
                />
              </SurfaceCard>
            </View>
          ) : null}
        </View>

        {drawer}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: spacing.xxl
        }}
        contentInsetAdjustmentBehavior="never"
      >
        <View
          style={{
            gap: spacing.lg,
            paddingHorizontal: spacing.lg,
            paddingTop: insets.top + spacing.lg
          }}
        >
        {loadState === "loading" ? (
          <SurfaceCard tone="accent">
            <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
              Finding your location
            </Text>
            <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
              Glide is requesting location access and scanning for nearby bikes.
            </Text>
          </SurfaceCard>
        ) : null}

        {loadState === "permission_denied" ? (
          <SurfaceCard tone="accent">
            <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
              Location access is off
            </Text>
            <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
              {errorMessage}
            </Text>
            <PrimaryButton label="Try Again" onPress={() => void requestLocationAndLoad()} />
          </SurfaceCard>
        ) : null}

        {loadState === "error" ? (
          <SurfaceCard tone="accent">
            <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
              We could not load nearby bikes
            </Text>
            <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
              {errorMessage}
            </Text>
            <PrimaryButton label="Retry" onPress={() => void requestLocationAndLoad()} />
          </SurfaceCard>
        ) : null}
        </View>
      </ScrollView>

      {drawer}
    </View>
  );
}
