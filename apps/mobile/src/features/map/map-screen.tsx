import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, ScrollView, Pressable, Text, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";

import type { Coordinates, NearbyBikesResult } from "@glide/shared";
import { formatDistanceKm } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { SurfaceCard } from "@/components/surface-card";
import { configuredBikeService } from "@/lib/bike-service";
import { colors, spacing } from "@/theme/tokens";

import { calculateDistanceKm, sortBikesByDistance } from "./bike-distance";
import { MapCanvas } from "./map-canvas";

export const DEFAULT_NEARBY_RADIUS_METERS = 1500;
export const MAP_POLL_INTERVAL_MS = 15000;
export const DEFAULT_MAP_COORDINATES = {
  latitude: 13.7563,
  longitude: 100.5018
} as const;

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
  const [quickActionsBikeId, setQuickActionsBikeId] = useState<string>();
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const loadNearbyBikes = useCallback(
    async (coordinates: Coordinates) => {
      const result = await configuredBikeService.listNearby({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        radiusMeters: DEFAULT_NEARBY_RADIUS_METERS,
        limit: 50
      });

      setNearbyResult(result);
      setSelectedBikeId((currentId) => currentId ?? result.bikes[0]?.id);
      setQuickActionsBikeId((currentId) =>
        currentId && result.bikes.some((bike) => bike.id === currentId) ? currentId : undefined
      );
      setLoadState("ready");
      setErrorMessage(undefined);
      setRefreshError(undefined);
    },
    []
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
      await loadNearbyBikes(coordinates);

      if (fallbackMessage) {
        setRefreshError(fallbackMessage);
      }
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
  }, [isFocused, loadNearbyBikes, nearbyResult, userCoordinates]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && userCoordinates) {
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
  }, [loadNearbyBikes, nearbyResult, userCoordinates]);

  const handleSelectBike = useCallback((bikeId: string) => {
    setSelectedBikeId(bikeId);
    setQuickActionsBikeId((currentId) => (currentId === bikeId ? currentId : undefined));
  }, []);

  const handleOpenQuickActions = useCallback((bikeId: string) => {
    setSelectedBikeId(bikeId);
    setQuickActionsBikeId(bikeId);
    void Haptics.selectionAsync();
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
      await loadNearbyBikes(coordinates);

      if (fallbackMessage) {
        setRefreshError(fallbackMessage);
      }
    } catch (error) {
      setRefreshError(
        error instanceof Error ? error.message : "Unable to recenter to your current location."
      );
    }
  }, [loadNearbyBikes]);

  const sortedBikes = useMemo(
    () => sortBikesByDistance(nearbyResult?.bikes ?? [], userCoordinates),
    [nearbyResult?.bikes, userCoordinates]
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

  return (
    <ScrollView
      contentContainerStyle={{
        gap: spacing.lg,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.xxl
      }}
      contentInsetAdjustmentBehavior="automatic"
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

      {loadState === "ready" ? (
        <>
          {refreshError ? (
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
          ) : null}

          <MapCanvas
            bikes={sortedBikes}
            bikeDistanceLabels={bikeDistanceLabels}
            onRecenter={() => void handleRecenterToCurrentLocation()}
            selectedBikeId={selectedBikeId}
            userCoordinates={userCoordinates}
            onSelectBike={handleSelectBike}
          />

          {sortedBikes.length ? (
            <View style={{ gap: spacing.md }}>
              <Text selectable style={{ color: colors.textMuted, fontSize: 14 }}>
                {nearbyResult?.serverTime
                  ? `Updated ${new Date(nearbyResult.serverTime).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit"
                    })}`
                  : "Last updated: Unknown"}
              </Text>

              {sortedBikes.map((bike) => (
                <Pressable
                  key={bike.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${bike.model}`}
                  onLongPress={() => handleOpenQuickActions(bike.id)}
                  onPress={() => handleSelectBike(bike.id)}
                >
                  <SurfaceCard tone={bike.id === selectedBikeId ? "accent" : "default"}>
                    <Text
                      selectable
                      style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}
                    >
                      {bike.model}
                    </Text>
                    <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
                      {bike.location} · {bike.pricingLabel}
                    </Text>
                    <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
                      {bikeDistanceLabels[bike.id] ?? "Distance unavailable"} · Range{" "}
                      {formatDistanceKm(bike.estimatedRangeKm)} · Status {bike.status}
                    </Text>

                    {bike.id === selectedBikeId ? (
                      <View style={{ gap: spacing.sm, marginTop: spacing.xs }}>
                        {quickActionsBikeId === bike.id ? (
                          <SurfaceCard tone="muted">
                            <Text
                              selectable
                              style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}
                            >
                              Quick actions
                            </Text>
                            <PrimaryButton
                              label="View Details"
                              onPress={() => router.push(`/bike/${bike.id}`)}
                              variant="secondary"
                            />
                            <PrimaryButton
                              label="Unlock and Ride"
                              onPress={() => router.push(`/unlock/${bike.id}`)}
                            />
                            <PrimaryButton
                              label="Need Help?"
                              onPress={() => router.push("/help")}
                              variant="secondary"
                            />
                          </SurfaceCard>
                        ) : (
                          <Text selectable style={{ color: colors.textMuted, fontSize: 14 }}>
                            Long press this card for quick actions.
                          </Text>
                        )}
                      </View>
                    ) : null}
                  </SurfaceCard>
                </Pressable>
              ))}
            </View>
          ) : (
            <SurfaceCard>
              <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                No bikes nearby right now
              </Text>
              <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                Try refreshing in a moment or moving to a busier pickup area.
              </Text>
              <PrimaryButton label="Refresh Nearby Bikes" onPress={() => void requestLocationAndLoad()} />
            </SurfaceCard>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}
