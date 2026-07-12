import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Bike, Coordinates } from "@glide/shared";
import { formatCurrency, formatDistanceKm, formatDuration } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { useAuth } from "@/features/auth/auth-provider";
import { configuredBikeService } from "@/lib/bike-service";
import { configuredBikeStatusService } from "@/lib/bike-status-service";
import { findRecentRewardMilestone } from "@/lib/reward-milestones";
import { configuredRideHistoryService } from "@/lib/ride-history-service";
import { hasSupabaseConfig } from "@/lib/supabase";
import { configuredWalletService } from "@/lib/wallet-service";
import { colors, radii, spacing } from "@/theme/tokens";
import { LiveRideRoutePreview } from "./live-ride-route-preview";
import { type ActiveRideBikeSnapshot, clearActiveRideSession, loadActiveRideSession, saveActiveRideSession } from "./active-ride-session";
import { useLiveRideTracker } from "./live-ride-tracker";
import { useRideSession } from "./ride-session-context";

const isTestEnvironment = process.env.NODE_ENV === "test";
const ARRIVAL_OVERLAY_MS = 1600;
const DROPOFF_BANNER_MS = 2800;

type ActiveRideSessionState =
  | {
      readonly status: "loading";
    }
  | {
      readonly status: "missing";
      readonly message: string;
    }
  | {
      readonly status: "ready";
      readonly bikeId: string;
      readonly bike: ActiveRideBikeSnapshot;
      readonly startedAtMs: number;
      readonly initialRoute: readonly Coordinates[];
      readonly metadataWarning?: string;
    };

function getDropoffGuidanceCopy(
  state: "en_route" | "approaching" | "arrived",
  label: string
) {
  if (state === "arrived") {
    return {
      eyebrow: "Ready to end ride",
      body: `You have reached ${label}. Park safely, then end your ride.`
    };
  }

  if (state === "approaching") {
    return {
      eyebrow: "Almost there",
      body: `You are close to ${label}. Slow down and prepare to park.`
    };
  }

  return {
    eyebrow: "Recommended drop-off",
    body: `Head to ${label} to end your ride smoothly.`
  };
}

function mapBikeToSessionBike(bike: Bike): ActiveRideBikeSnapshot {
  return {
    id: bike.id,
    model: bike.model,
    location: bike.location,
    coordinates: bike.coordinates,
    ...(bike.ratePerMinute !== undefined ? { ratePerMinute: bike.ratePerMinute } : {}),
    ...(bike.imageUrl ? { imageUrl: bike.imageUrl } : {}),
    ...(bike.rideClass ? { rideClass: bike.rideClass } : {}),
    ...(bike.estimatedRangeKm !== undefined ? { estimatedRangeKm: bike.estimatedRangeKm } : {}),
    ...(bike.topSpeedKmh !== undefined ? { topSpeedKmh: bike.topSpeedKmh } : {}),
    ...(bike.pricingLabel ? { pricingLabel: bike.pricingLabel } : {}),
    ...(bike.status ? { status: bike.status } : {}),
    ...(bike.activeRiderId !== undefined ? { activeRiderId: bike.activeRiderId } : {}),
    ...(bike.lastReportedAt ? { lastReportedAt: bike.lastReportedAt } : {})
  };
}

function getBikeRefreshWarning(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Could not refresh bike details.";
}

async function reconcilePendingStatusSyncs(accessToken: string) {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const pendingKeys = keys.filter((key) => key.startsWith("pending_release_"));
    for (const key of pendingKeys) {
      try {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          const { bikeId } = JSON.parse(value);
          await configuredBikeStatusService.updateBikeStatus({
            bikeId,
            status: "available",
            accessToken
          });
          await AsyncStorage.removeItem(key);
        }
      } catch (err) {
        console.error(`Failed to reconcile pending status sync for key ${key}:`, err);
      }
    }
  } catch (error) {
    console.error("Failed to reconcile pending status syncs:", error);
  }
}

function LoadingActiveRideScreen() {
  return (
    <ScreenShell
      title="Glide Ride Dashboard"
      description="Restoring your live ride session.">
      <SurfaceCard tone="accent">
        <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
          Restoring active ride
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          Glide is reloading your saved ride session and bike details.
        </Text>
      </SurfaceCard>
    </ScreenShell>
  );
}

function MissingActiveRideScreen({ onGoHome, message }: { readonly onGoHome: () => void; readonly message?: string }) {
  return (
    <ScreenShell
      title="Glide Ride Dashboard"
      description="No active ride session was found.">
      <SurfaceCard tone="muted">
        <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
          No active ride session
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          {message ?? "We could not find a saved ride session to restore. Start a new ride from the map."}
        </Text>
      </SurfaceCard>

      <PrimaryButton label="Go to map" onPress={onGoHome} />
    </ScreenShell>
  );
}

function ActiveRideDashboard({
  bikeId,
  bike,
  startedAtMs,
  initialRoute,
  enteredFromUnlock,
  metadataWarning
}: {
  readonly bikeId: string;
  readonly bike: ActiveRideBikeSnapshot;
  readonly startedAtMs: number;
  readonly initialRoute: readonly Coordinates[];
  readonly enteredFromUnlock: boolean;
  readonly metadataWarning?: string;
}) {
  const router = useRouter();
  const { session } = useAuth();
  const { setBikeRideState } = useRideSession();
  const [showArrivalOverlay, setShowArrivalOverlay] = useState(enteredFromUnlock);
  const [showDropoffArrivalBanner, setShowDropoffArrivalBanner] = useState(false);
  const [endRideError, setEndRideError] = useState<string | null>(null);
  const [isEndingRide, setIsEndingRide] = useState(false);
  const hasAnnouncedDropoffArrivalRef = useRef(false);
  const heroOpacity = useRef(new Animated.Value(isTestEnvironment ? 1 : 0)).current;
  const heroTranslateY = useRef(new Animated.Value(isTestEnvironment ? 0 : 20)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(enteredFromUnlock && !isTestEnvironment ? 1 : 0)).current;
  const overlayScale = useRef(new Animated.Value(isTestEnvironment ? 1 : 0.96)).current;

  const { dropoffGuidance, snapshot, trackingState, warningMessage } = useLiveRideTracker({
    bikeId,
    startCoordinates: bike.coordinates,
    initialRoute,
    startedAtMs,
    ...(bike.ratePerMinute !== undefined ? { ratePerMinute: bike.ratePerMinute } : {}),
    startLocation: bike.location
  });

  useEffect(() => {
    if (session?.access_token) {
      reconcilePendingStatusSyncs(session.access_token).catch((err) => {
        console.error("Reconciliation failed", err);
      });
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (isTestEnvironment) {
      heroOpacity.setValue(1);
      heroTranslateY.setValue(0);
      glowPulse.setValue(0);
      overlayOpacity.setValue(showArrivalOverlay ? 1 : 0);
      overlayScale.setValue(1);
      return;
    }

    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(heroTranslateY, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false
        }),
        Animated.timing(glowPulse, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: false
        })
      ])
    );

    pulse.start();

    return () => {
      pulse.stop();
      glowPulse.stopAnimation();
    };
  }, [glowPulse, heroOpacity, heroTranslateY, overlayOpacity, overlayScale, showArrivalOverlay]);

  useEffect(() => {
    if (!showArrivalOverlay || isTestEnvironment) {
      return;
    }

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        }),
        Animated.timing(overlayScale, {
          toValue: 1.04,
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true
        })
      ]).start(({ finished }) => {
        if (finished) {
          setShowArrivalOverlay(false);
        }
      });
    }, ARRIVAL_OVERLAY_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [overlayOpacity, overlayScale, showArrivalOverlay]);

  const pulseScale = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.04]
  });
  const pulseOpacity = glowPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.16, 0.32]
  });
  const dropoffGuidanceCopy = useMemo(
    () => getDropoffGuidanceCopy(dropoffGuidance.state, dropoffGuidance.zone.label),
    [dropoffGuidance.state, dropoffGuidance.zone.label]
  );

  useEffect(() => {
    if (dropoffGuidance.state !== "arrived" || hasAnnouncedDropoffArrivalRef.current) {
      return;
    }

    hasAnnouncedDropoffArrivalRef.current = true;
    setShowDropoffArrivalBanner(true);

    const timer = setTimeout(() => {
      setShowDropoffArrivalBanner(false);
    }, DROPOFF_BANNER_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [dropoffGuidance.state]);

  useEffect(() => {
    void saveActiveRideSession({
      bikeId,
      startedAtMs,
      route: snapshot.route,
      bike
    });
  }, [bike, bikeId, snapshot.route, startedAtMs]);

  async function handleEndRide() {
    if (!hasSupabaseConfig) {
      router.push("/ride/summary");
      return;
    }

    setIsEndingRide(true);
    setEndRideError(null);

    try {
      const ride = await configuredRideHistoryService.completeRide({
        bikeId,
        durationSec: snapshot.durationSec,
        distanceKm: snapshot.distanceKm,
        totalCost: snapshot.currentCost,
        ratePerMinute: snapshot.ratePerMinute,
        routeLabel: snapshot.routeLabel,
        endLocation: snapshot.endLocation,
        co2SavedKg: snapshot.co2SavedKg,
        route: snapshot.route,
        checkpoints: snapshot.checkpoints
      });

      if (!session?.access_token) {
        try {
          await AsyncStorage.setItem(
            `pending_release_${bikeId}`,
            JSON.stringify({
              bikeId,
              status: "available",
              timestamp: new Date().toISOString()
            })
          );
        } catch (storageError) {
          console.error("Failed to persist pending retry", storageError);
        }
        throw new Error("Session access token is missing. Saved pending status sync.");
      }

      try {
        await configuredBikeStatusService.updateBikeStatus({
          bikeId,
          status: "available",
          accessToken: session.access_token
        });

        try {
          await AsyncStorage.removeItem(`pending_release_${bikeId}`);
        } catch {
          // Ignore cleanup failures.
        }

        setBikeRideState(bikeId, {
          status: "available",
          activeRiderId: null
        });

        await clearActiveRideSession();
      } catch (statusError) {
        console.error("Failed to sync bike status", { bikeId, statusError });
        try {
          await AsyncStorage.setItem(
            `pending_release_${bikeId}`,
            JSON.stringify({
              bikeId,
              status: "available",
              timestamp: new Date().toISOString()
            })
          );
        } catch (storageError) {
          console.error("Failed to persist pending retry", storageError);
        }
        throw statusError;
      }

      let milestone: string | undefined;
      try {
        const wallet = await configuredWalletService.getWallet();
        milestone =
          findRecentRewardMilestone(wallet.transactions, [
            "first_ride",
            "five_rides",
            "ten_rides"
          ]) ?? undefined;
      } catch {
        milestone = undefined;
      }

      router.push({
        pathname: "/ride/summary",
        params: milestone ? { id: ride.id, milestone } : { id: ride.id }
      });
    } catch (error) {
      setEndRideError(error instanceof Error ? error.message : "Unable to complete the ride.");
    } finally {
      setIsEndingRide(false);
    }
  }

  return (
    <>
      <ScreenShell
        title="Glide Ride Dashboard"
        description="The ride is live with local route tracking, fare estimates, and drop-off guidance.">
        <Animated.View
          style={{
            gap: spacing.md,
            opacity: heroOpacity,
            transform: [{ translateY: heroTranslateY }]
          }}>
          <View
            style={{
              backgroundColor: colors.teal,
              borderCurve: "continuous",
              borderRadius: radii.large,
              minHeight: 220,
              overflow: "hidden",
              padding: spacing.lg,
              position: "relative"
            }}>
            <Animated.View
              style={{
                backgroundColor: "rgba(207, 230, 218, 0.28)",
                borderRadius: 999,
                height: 220,
                opacity: pulseOpacity,
                position: "absolute",
                right: -40,
                top: -10,
                transform: [{ scale: pulseScale }],
                width: 220
              }}
            />
            <Animated.View
              style={{
                backgroundColor: "rgba(157, 186, 177, 0.28)",
                borderRadius: 999,
                height: 220,
                opacity: pulseOpacity,
                position: "absolute",
                right: -40,
                top: -10,
                transform: [{ scale: pulseScale }],
                width: 220
              }}
            />
            <Animated.View
              style={{
                backgroundColor: "rgba(93, 179, 153, 0.18)",
                borderRadius: 999,
                height: 150,
                left: -20,
                position: "absolute",
                top: 80,
                transform: [{ scale: pulseScale }],
                width: 150
              }}
            />

            <View style={{ gap: spacing.sm }}>
              <Text selectable style={{ color: colors.tealBright, fontSize: 14, fontWeight: "700" }}>
                Ride live now
              </Text>
              <Text
                selectable
                style={{
                  color: colors.surface,
                  fontSize: 30,
                  fontWeight: "800",
                  letterSpacing: 0
                }}>
                {bikeId} is tracking live
              </Text>
              <Text
                selectable
                style={{
                  color: "rgba(255, 255, 255, 0.82)",
                  fontSize: 15,
                  lineHeight: 22
                }}>
                Live Ride Companion is recording your route, estimating fare, and watching the next clean drop-off.
              </Text>
              <Text
                selectable
                style={{
                  color: "rgba(255, 255, 255, 0.88)",
                  fontSize: 16,
                  fontWeight: "700"
                }}>
                {bike.model}
              </Text>
            </View>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: spacing.sm,
                marginTop: spacing.lg
              }}>
              <View
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.14)",
                  borderCurve: "continuous",
                  borderRadius: radii.medium,
                  gap: 4,
                  minWidth: 128,
                  padding: spacing.md
                }}>
                <Text selectable style={{ color: "rgba(255, 255, 255, 0.72)", fontSize: 13 }}>
                  Ride time
                </Text>
                <Text
                  selectable
                  style={{
                    color: colors.surface,
                    fontSize: 24,
                    fontVariant: ["tabular-nums"],
                    fontWeight: "800"
                  }}>
                  {formatDuration(snapshot.durationSec)}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.14)",
                  borderCurve: "continuous",
                  borderRadius: radii.medium,
                  gap: 4,
                  minWidth: 128,
                  padding: spacing.md
                }}>
                <Text selectable style={{ color: "rgba(255, 255, 255, 0.72)", fontSize: 13 }}>
                  Live fare
                </Text>
                <Text
                  selectable
                  style={{
                    color: colors.surface,
                    fontSize: 24,
                    fontVariant: ["tabular-nums"],
                    fontWeight: "800"
                  }}>
                  {formatCurrency(snapshot.currentCost)}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.14)",
                  borderCurve: "continuous",
                  borderRadius: radii.medium,
                  gap: 4,
                  minWidth: 128,
                  padding: spacing.md
                }}>
                <Text selectable style={{ color: "rgba(255, 255, 255, 0.72)", fontSize: 13 }}>
                  Distance
                </Text>
                <Text
                  selectable
                  style={{
                    color: colors.surface,
                    fontSize: 24,
                    fontVariant: ["tabular-nums"],
                    fontWeight: "800"
                  }}>
                  {formatDistanceKm(snapshot.distanceKm)}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.14)",
                  borderCurve: "continuous",
                  borderRadius: radii.medium,
                  gap: 4,
                  minWidth: 128,
                  padding: spacing.md
                }}>
                <Text selectable style={{ color: "rgba(255, 255, 255, 0.72)", fontSize: 13 }}>
                  CO2 saved
                </Text>
                <Text
                  selectable
                  style={{
                    color: colors.surface,
                    fontSize: 24,
                    fontVariant: ["tabular-nums"],
                    fontWeight: "800"
                  }}>
                  {snapshot.co2SavedKg} kg
                </Text>
              </View>
            </View>
          </View>

          <View style={{ gap: spacing.md }}>
            <SurfaceCard tone="accent">
              <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                Live Ride Companion
              </Text>
              <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                You have covered {formatDistanceKm(snapshot.distanceKm)} in {formatDuration(snapshot.durationSec)}. Tracking mode: {trackingState.replaceAll("_", " ")}.
              </Text>
              <Text selectable style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                Current fare estimate: {formatCurrency(snapshot.currentCost)}
              </Text>
            </SurfaceCard>

            {metadataWarning ? (
              <SurfaceCard tone="muted">
                <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                  Ride details restored
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                  {metadataWarning}
                </Text>
              </SurfaceCard>
            ) : null}

            {warningMessage ? (
              <SurfaceCard tone="muted">
                <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                  Tracking fallback active
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                  {warningMessage}
                </Text>
              </SurfaceCard>
            ) : null}

            {showDropoffArrivalBanner ? (
              <SurfaceCard tone="accent">
                <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                  You are inside the drop-off zone.
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                  Park safely at {dropoffGuidance.zone.label}, then end your ride when you are ready.
                </Text>
              </SurfaceCard>
            ) : null}

            <SurfaceCard>
              <Text selectable style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>
                {dropoffGuidanceCopy.eyebrow}
              </Text>
              <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                {dropoffGuidance.zone.label}
              </Text>
              <View style={{ gap: spacing.xs }}>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                  {dropoffGuidanceCopy.body}
                </Text>
                <Text selectable style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                  {formatDistanceKm(dropoffGuidance.remainingDistanceKm)} remaining
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
                  We will keep updating the closest drop-off as you ride.
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
                  Guidance state: {dropoffGuidance.state.replaceAll("_", " ")}
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
                  Route: {snapshot.routeLabel}
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
                  Bike ID: {bikeId}
                </Text>
              </View>
            </SurfaceCard>

            <LiveRideRoutePreview snapshot={snapshot} dropoffGuidance={dropoffGuidance} />
          </View>
        </Animated.View>

        <View style={{ gap: spacing.sm }}>
          <PrimaryButton label="Pause Ride" variant="secondary" disabled />
          <PrimaryButton
            label={isEndingRide ? "Ending Ride..." : "End Ride"}
            onPress={() => void handleEndRide()}
            disabled={isEndingRide}
          />
          {endRideError ? (
            <Text selectable style={{ color: colors.danger, fontSize: 15, lineHeight: 22 }}>
              {endRideError}
            </Text>
          ) : null}
        </View>
      </ScreenShell>

      {showArrivalOverlay ? (
        <Animated.View
          pointerEvents="none"
          style={{
            alignItems: "center",
            backgroundColor: "rgba(5, 107, 76, 0.92)",
            bottom: 0,
            justifyContent: "center",
            left: 0,
            opacity: overlayOpacity,
            padding: spacing.xl,
            position: "absolute",
            right: 0,
            top: 0,
            transform: [{ scale: overlayScale }]
          }}>
          <View
            style={{
              alignItems: "center",
              gap: spacing.md
            }}>
            <View
              style={{
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.14)",
                borderRadius: 999,
                height: 120,
                justifyContent: "center",
                width: 120
              }}>
              <Text selectable style={{ color: colors.surfaceStrong, fontSize: 46, fontWeight: "800" }}>
                GO
              </Text>
            </View>
            <Text
              selectable
              style={{
                color: colors.surface,
                fontSize: 30,
                fontWeight: "800",
                letterSpacing: -0.8,
                textAlign: "center"
              }}>
              Bike unlocked
            </Text>
            <Text
              selectable
              style={{
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: 16,
                lineHeight: 24,
                textAlign: "center"
              }}>
              {bikeId} is ready. Glide is switching from unlock mode to the live ride dashboard.
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </>
  );
}

export function ActiveRideScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bikeId?: string; entry?: string }>();
  const enteredFromUnlock = params.entry === "unlock";
  const requestedBikeId = typeof params.bikeId === "string" ? params.bikeId : undefined;
  const [sessionState, setSessionState] = useState<ActiveRideSessionState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function hydrateRideSession() {
      const storedSession = await loadActiveRideSession();

      if (cancelled) {
        return;
      }

      const resolvedBikeId = requestedBikeId ?? storedSession?.bikeId;

      if (!resolvedBikeId) {
        setSessionState({
          status: "missing",
          message: "No active ride session was found."
        });
        return;
      }

      const persistedSession =
        storedSession && storedSession.bikeId === resolvedBikeId ? storedSession : null;

      let sessionBike = persistedSession?.bike ?? null;
      let metadataWarning: string | undefined;

      try {
        const fetchedBike = await configuredBikeService.getById(resolvedBikeId);
        if (cancelled) return;
        if (fetchedBike) {
          sessionBike = mapBikeToSessionBike(fetchedBike);
        } else if (!sessionBike) {
          setSessionState({
            status: "missing",
            message: `Bike ${resolvedBikeId} could not be loaded.`
          });
          return;
        }
      } catch (error) {
        if (cancelled) return;
        metadataWarning = getBikeRefreshWarning(error);
        if (!sessionBike) {
          setSessionState({
            status: "missing",
            message: `Bike ${resolvedBikeId} could not be loaded.`
          });
          return;
        }
      }

      if (!sessionBike) {
        setSessionState({
          status: "missing",
          message: `Bike ${resolvedBikeId} could not be loaded.`
        });
        return;
      }

      setSessionState({
        status: "ready",
        bikeId: resolvedBikeId,
        bike: sessionBike,
        startedAtMs: persistedSession?.startedAtMs ?? Date.now(),
        initialRoute: persistedSession?.route ?? [sessionBike.coordinates],
        ...(metadataWarning ? { metadataWarning } : {})
      });
    }

    void hydrateRideSession().catch((error) => {
      console.error("Failed to hydrate active ride session", error);
      if (!cancelled) {
        setSessionState({
          status: "missing",
          message: "No active ride session was found."
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [requestedBikeId]);

  if (sessionState.status === "loading") {
    return <LoadingActiveRideScreen />;
  }

  if (sessionState.status === "missing") {
    return <MissingActiveRideScreen onGoHome={() => router.push("/")} message={sessionState.message} />;
  }

  return (
    <ActiveRideDashboard
      key={sessionState.bikeId}
      bikeId={sessionState.bikeId}
      bike={sessionState.bike}
      startedAtMs={sessionState.startedAtMs}
      initialRoute={sessionState.initialRoute}
      enteredFromUnlock={enteredFromUnlock}
      {...(sessionState.metadataWarning ? { metadataWarning: sessionState.metadataWarning } : {})}
    />
  );
}
