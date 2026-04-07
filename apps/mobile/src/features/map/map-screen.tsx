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
import { configuredBikeService } from "@/lib/bike-service";
import { spacing } from "@/theme/tokens";

import { calculateDistanceKm, sortBikesByDistance } from "./bike-distance";
import { MapCanvas } from "./map-canvas";

export const DEFAULT_NEARBY_RADIUS_METERS = 1500;
export const MAP_POLL_INTERVAL_MS = 15000;

type LoadState = "loading" | "ready" | "permission_denied" | "error";

export function MapScreen() {
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

  const loadNearbyBikes = useCallback(async (coordinates: Coordinates) => {
    const result = await configuredBikeService.listNearby({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      radiusMeters: DEFAULT_NEARBY_RADIUS_METERS,
      limit: 50
    });

    setNearbyResult(result);
    setSelectedBikeId((currentId) => currentId ?? result.bikes[0]?.id);
    setLoadState("ready");
    setErrorMessage(undefined);
    setRefreshError(undefined);
  }, []);

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
        error instanceof Error ? error.message : "We could not determine your current location."
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
      void loadNearbyBikes(userCoordinates).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Failed to refresh nearby bikes.";

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
        void loadNearbyBikes(userCoordinates).catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Failed to refresh nearby bikes.";

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

  const handleRecenterToCurrentLocation = useCallback(async () => {
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
  }, [loadNearbyBikes]);

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

        {loadState === "ready" ? (
          <>
            <MapCanvas
              bikes={sortedBikes}
              bikeDistanceLabels={bikeDistanceLabels}
              onRecenter={() => void handleRecenterToCurrentLocation()}
              selectedBikeId={selectedBikeId}
              userCoordinates={userCoordinates}
              onSelectBike={handleSelectBike}
            />

            <BottomSheet
              visible={sheetVisible && Boolean(selectedBike)}
              title={selectedBike ? `${selectedBike.model}` : "Bike details"}
              onClose={() => setSheetVisible(false)}>
              {refreshError ? (
                <SurfaceCard tone="muted">
                  <AppText variant="label">Refresh paused</AppText>
                  <AppText variant="body">{refreshError}</AppText>
                </SurfaceCard>
              ) : null}

              {selectedBike ? (
                <BikeCard
                  bike={selectedBike}
                  {...(bikeDistanceLabels[selectedBike.id]
                    ? { distanceLabel: bikeDistanceLabels[selectedBike.id] }
                    : {})}
                  selected
                  onRentNow={() => router.push(`/unlock/${selectedBike.id}`)}
                  onHelp={() => router.push("/help")}
                  onRing={() => void Haptics.selectionAsync()}
                  onDamage={() => router.push(`/bike/${selectedBike.id}`)}
                />
              ) : null}
            </BottomSheet>
          </>
        ) : null}
      </View>
    </Screen>
  );
}
