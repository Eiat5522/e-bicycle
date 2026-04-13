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
import { configuredBikeService } from "@/lib/bike-service";
import { colors, spacing } from "@/theme/tokens";

import { calculateDistanceKm, sortBikesByDistance } from "./bike-distance";
import { BikeMarkerDrawer } from "./bike-marker-drawer";
import { MapCanvas } from "./map-canvas";

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
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [refreshError, setRefreshError] = useState<string>();
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
      notice: "No bikes within 1.5 km. Showing the closest bikes from a wider area."
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
      setRefreshError(undefined);
      return;
    }

    try {
      let coordinates: Coordinates;
      let fallbackMessage: string | undefined;

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
          fallbackMessage =
            "Live location timed out. Showing bikes near your last known position.";
        } else {
          coordinates = DEFAULT_MAP_COORDINATES;
          fallbackMessage =
            "Live location timed out. Showing bikes near central Bangkok for now.";
        }
      }

      setUserCoordinates(coordinates);
      const nearbyNotice = await loadNearbyBikes(coordinates);

      setRefreshError([fallbackMessage, nearbyNotice].filter(Boolean).join(" ") || undefined);
    } catch (error) {
      setLoadState("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not determine your current location."
      );
      setRefreshError(undefined);
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
        .then((notice) => {
          setRefreshError(notice);
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : "Failed to refresh nearby bikes.";

          setErrorMessage(message);

          if (!nearbyResult) {
            setLoadState("error");
            return;
          }

          setRefreshError("Unable to refresh right now. Showing the latest available bikes.");
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
          .then((notice) => {
            setRefreshError(notice);
          })
          .catch((error: unknown) => {
            const message =
              error instanceof Error ? error.message : "Failed to refresh nearby bikes.";

            setErrorMessage(message);

            if (!nearbyResult) {
              setLoadState("error");
              return;
            }

            setRefreshError("Unable to refresh right now. Showing the latest available bikes.");
          });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadNearbyBikes, nearbyResult, userCoordinates]);

  const handlePressMarker = useCallback((bikeId: string) => {
    setSelectedBikeId(bikeId);
    setDrawerBikeId(bikeId);
  }, []);

  const handleRecenterToCurrentLocation = useCallback(async () => {
    try {
      let coordinates: Coordinates;
      let fallbackMessage: string | undefined;

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
          fallbackMessage =
            "Live location timed out. Recentered to your last known position instead.";
        } else {
          coordinates = DEFAULT_MAP_COORDINATES;
          fallbackMessage =
            "Live location timed out. Recentered to central Bangkok instead.";
        }
      }

      setUserCoordinates(coordinates);
      const nearbyNotice = await loadNearbyBikes(coordinates);

      setRefreshError([fallbackMessage, nearbyNotice].filter(Boolean).join(" ") || undefined);
    } catch (error) {
      setRefreshError(
        error instanceof Error ? error.message : "Unable to recenter to your current location."
      );
    }
  }, [loadNearbyBikes]);

  const bikesWithSeedImages = useMemo(
    () =>
      (nearbyResult?.bikes ?? []).map((bike) => ({
        ...bike,
        imageUrl: bike.imageUrl ?? getSeedBikeImageUrl(bike.id)
      })),
    [nearbyResult?.bikes]
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
  const mapCenter = nearbyResult?.searchCenter ?? userCoordinates;

  const drawer = (
    <BikeMarkerDrawer
      bike={drawerBike}
      distanceLabel={drawerBike ? bikeDistanceLabels[drawerBike.id] : undefined}
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
            mapCenter={mapCenter}
            onRecenter={() => void handleRecenterToCurrentLocation()}
            selectedBikeId={selectedBikeId}
            userCoordinates={userCoordinates}
            onPressMarker={handlePressMarker}
          />

          {refreshError ? (
            <View
              style={{
                left: spacing.lg,
                position: "absolute",
                right: spacing.lg,
                top: insets.top + spacing.md
              }}
            >
              <SurfaceCard tone="accent">
                <Text selectable style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                  Refresh paused
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                  {refreshError}
                </Text>
                <PrimaryButton
                  label="Dismiss"
                  onPress={() => setRefreshError(undefined)}
                  variant="secondary"
                />
              </SurfaceCard>
            </View>
          ) : null}

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
              Glide is requesting location access and loading bikes within 1.5 km.
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
