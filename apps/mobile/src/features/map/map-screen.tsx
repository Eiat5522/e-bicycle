import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";

import type { Coordinates, NearbyBikesResult } from "@glide/shared";
import { formatDistanceKm } from "@glide/shared";

import { BikeCard } from "@/components/bike/bike-card";
import { Screen } from "@/components/layout/screen";
import { Stack } from "@/components/layout/stack";
import { PrimaryButton } from "@/components/primary-button";
import { SurfaceCard } from "@/components/surface-card";
import { AppText } from "@/components/ui/app-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { useAuth } from "@/features/auth/auth-context";
import { configuredBikeService } from "@/lib/bike-service";
import { colors, spacing } from "@/theme/tokens";

import { calculateDistanceKm, sortBikesByDistance } from "./bike-distance";
import { MapCanvas } from "./map-canvas";

export const DEFAULT_NEARBY_RADIUS_METERS = 1500;
export const MAP_POLL_INTERVAL_MS = 15000;

type LoadState = "loading" | "ready" | "permission_denied" | "error";

export function MapScreen() {
  const { isLoading: isAuthLoading, session } = useAuth();
  const isFocused = useIsFocused();
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [refreshError, setRefreshError] = useState<string>();
  const [userCoordinates, setUserCoordinates] = useState<Coordinates>();
  const [nearbyResult, setNearbyResult] = useState<NearbyBikesResult>();
  const [selectedBikeId, setSelectedBikeId] = useState<string>();
  const [sheetVisible, setSheetVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const loadNearbyBikes = useCallback(
    async (coordinates: Coordinates) => {
      const result = await configuredBikeService.listNearby({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        radiusMeters: DEFAULT_NEARBY_RADIUS_METERS,
        limit: 50
      });
      const nearestBike = sortBikesByDistance(result.bikes, coordinates)[0];

      setNearbyResult(result);
      setSelectedBikeId((currentId) =>
        currentId && result.bikes.some((bike) => bike.id === currentId) ? currentId : nearestBike?.id
      );
      setLoadState("ready");
      setErrorMessage(undefined);
      setRefreshError(undefined);
    },
    []
  );

  const requestLocationAndLoad = useCallback(async () => {
    if (isAuthLoading || !session) {
      return;
    }

    setLoadState("loading");

    const permission = await Location.requestForegroundPermissionsAsync();

    if (!permission.granted) {
      setLoadState("permission_denied");
      setErrorMessage("Location permission is required to show bikes near you.");
      setRefreshError(undefined);
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      const coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      setUserCoordinates(coordinates);
      await loadNearbyBikes(coordinates);
    } catch (error) {
      setLoadState("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not determine your current location."
      );
      setRefreshError(undefined);
    }
  }, [isAuthLoading, loadNearbyBikes, session]);

  useEffect(() => {
    if (!isAuthLoading && session) {
      void requestLocationAndLoad();
    }
  }, [isAuthLoading, requestLocationAndLoad, session]);

  useEffect(() => {
    if (isAuthLoading || !session || !isFocused || !userCoordinates) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      void loadNearbyBikes(userCoordinates).catch((error: unknown) => {
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
  }, [isAuthLoading, isFocused, loadNearbyBikes, nearbyResult, session, userCoordinates]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (!isAuthLoading && session && nextState === "active" && userCoordinates) {
        void loadNearbyBikes(userCoordinates).catch((error: unknown) => {
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
  }, [isAuthLoading, loadNearbyBikes, nearbyResult, session, userCoordinates]);

  const handleRecenterToCurrentLocation = useCallback(async () => {
    if (isAuthLoading || !session) {
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      const coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      setUserCoordinates(coordinates);
      await loadNearbyBikes(coordinates);
    } catch (error) {
      setRefreshError(
        error instanceof Error ? error.message : "Unable to recenter to your current location."
      );
    }
  }, [isAuthLoading, loadNearbyBikes, session]);

  const sortedBikes = useMemo(
    () => sortBikesByDistance(nearbyResult?.bikes ?? [], userCoordinates),
    [nearbyResult?.bikes, userCoordinates]
  );
  const selectedBike = useMemo(
    () => sortedBikes.find((bike) => bike.id === selectedBikeId) ?? sortedBikes[0],
    [selectedBikeId, sortedBikes]
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

  const handleSelectBike = useCallback((bikeId: string) => {
    setSelectedBikeId(bikeId);
    setSheetVisible(true);
    void Haptics.selectionAsync();
  }, []);

  const shouldRenderMap = loadState === "ready" || (loadState === "error" && Boolean(userCoordinates));

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {loadState === "loading" ? (
          <View style={{ padding: spacing.md }}>
            <SurfaceCard tone="muted">
              <AppText variant="h3">Finding your location</AppText>
              <AppText variant="body">
                Glide is requesting location access and loading bikes within 1.5 km.
              </AppText>
            </SurfaceCard>
          </View>
        ) : null}

        {loadState === "permission_denied" ? (
          <View style={{ padding: spacing.md }}>
            <SurfaceCard tone="accent">
              <Stack gap={spacing.sm}>
                <AppText variant="h3">Location access is off</AppText>
                <AppText variant="body">{errorMessage}</AppText>
                <PrimaryButton label="Try Again" onPress={() => void requestLocationAndLoad()} />
              </Stack>
            </SurfaceCard>
          </View>
        ) : null}

        {loadState === "error" ? (
          <View style={{ padding: spacing.md }}>
            <SurfaceCard tone="accent">
              <Stack gap={spacing.sm}>
                <AppText variant="h3">We could not load nearby bikes</AppText>
                <AppText variant="body">{errorMessage}</AppText>
                <PrimaryButton label="Retry" onPress={() => void requestLocationAndLoad()} />
              </Stack>
            </SurfaceCard>
          </View>
        ) : null}

        {shouldRenderMap ? (
          <>
            <MapCanvas
              bikes={sortedBikes}
              bikeDistanceLabels={bikeDistanceLabels}
              onRecenter={() => void handleRecenterToCurrentLocation()}
              selectedBikeId={selectedBikeId}
              userCoordinates={userCoordinates}
              onSelectBike={handleSelectBike}
            />

            {loadState === "ready" ? (
              <BottomSheet
                visible={sortedBikes.length === 0 || (sheetVisible && Boolean(selectedBike))}
                title={selectedBike ? selectedBike.model : "No bikes nearby right now"}
                onClose={() => setSheetVisible(false)}
              >
                {refreshError ? (
                  <SurfaceCard tone="muted">
                    <AppText variant="label">Refresh paused</AppText>
                    <AppText variant="body">{refreshError}</AppText>
                    <PrimaryButton
                      label="Dismiss"
                      onPress={() => setRefreshError(undefined)}
                      variant="secondary"
                    />
                  </SurfaceCard>
                ) : null}

                {selectedBike ? (
                  <>
                    <AppText variant="caption" color={colors.textMuted}>
                      {nearbyResult?.serverTime
                        ? `Updated ${new Date(nearbyResult.serverTime).toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit"
                          })}`
                        : "Last updated: Unknown"}
                    </AppText>
                    <BikeCard
                      bike={selectedBike}
                      distanceLabel={bikeDistanceLabels[selectedBike.id]}
                      selected
                      onRentNow={() => router.push(`/unlock/${selectedBike.id}`)}
                      onHelp={() => router.push("/help")}
                      // TODO(onRing): Wire this to configuredBikeService.ringBike/ringDevice and
                      // restore Haptics.selectionAsync() when the backend ring action exists.
                      onDamage={() => router.push(`/bike/${selectedBike.id}`)}
                    />
                  </>
                ) : (
                  <Stack gap={spacing.sm}>
                    <AppText variant="body">
                      Try refreshing in a moment or moving to a busier pickup area.
                    </AppText>
                    <PrimaryButton
                      label="Refresh Nearby Bikes"
                      onPress={() => void requestLocationAndLoad()}
                    />
                  </Stack>
                )}
              </BottomSheet>
            ) : null}
          </>
        ) : null}
      </View>
    </Screen>
  );
}
