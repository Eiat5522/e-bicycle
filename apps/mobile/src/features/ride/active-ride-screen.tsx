import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";

import { mockActiveRide, mockBikes } from "@glide/api";
import { formatCurrency, formatDistanceKm, formatDuration } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { configuredRideHistoryService } from "@/lib/ride-history-service";
import { hasSupabaseConfig } from "@/lib/supabase";
import { colors, radii, spacing } from "@/theme/tokens";
import { LiveRideRoutePreview } from "./live-ride-route-preview";
import { useLiveRideTracker } from "./live-ride-tracker";
import { useRideSession } from "./ride-session-context";

const isTestEnvironment = process.env.NODE_ENV === "test";
const ARRIVAL_OVERLAY_MS = 1600;

export function ActiveRideScreen() {
  const router = useRouter();
  const { setBikeRideState } = useRideSession();
  const params = useLocalSearchParams<{ bikeId?: string; entry?: string }>();
  const bikeId = params.bikeId ?? mockActiveRide.bikeId;
  const bike = useMemo(() => mockBikes.find((mockBike) => mockBike.id === bikeId), [bikeId]);
  const trackerOptions = useMemo(
    () => ({
      bikeId,
      ...(bike?.coordinates ? { startCoordinates: bike.coordinates } : {}),
      ...(bike?.ratePerMinute !== undefined ? { ratePerMinute: bike.ratePerMinute } : {}),
      startLocation: bike?.location ?? mockActiveRide.startLocation
    }),
    [bike?.coordinates, bike?.location, bike?.ratePerMinute, bikeId]
  );
  const { nearestDropoff, snapshot, trackingState, warningMessage } =
    useLiveRideTracker(trackerOptions);
  const enteredFromUnlock = params.entry === "unlock";
  const [showArrivalOverlay, setShowArrivalOverlay] = useState(enteredFromUnlock);
  const [endRideError, setEndRideError] = useState<string | null>(null);
  const [isEndingRide, setIsEndingRide] = useState(false);
  const heroOpacity = useRef(new Animated.Value(isTestEnvironment ? 1 : 0)).current;
  const heroTranslateY = useRef(new Animated.Value(isTestEnvironment ? 0 : 20)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(enteredFromUnlock && !isTestEnvironment ? 1 : 0)).current;
  const overlayScale = useRef(new Animated.Value(isTestEnvironment ? 1 : 0.96)).current;

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
      setBikeRideState(bikeId, {
        status: "available",
        activeRiderId: null
      });
      router.push({
        pathname: "/ride/summary",
        params: { id: ride.id }
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
                You have covered {formatDistanceKm(snapshot.distanceKm)} in {formatDuration(snapshot.durationSec)}. Tracking mode: {trackingState.replace(/_/g, " ")}.
              </Text>
              <Text selectable style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                Current fare estimate: {formatCurrency(snapshot.currentCost)}
              </Text>
            </SurfaceCard>

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

            <SurfaceCard>
              <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                Drop-off guidance
              </Text>
              <View style={{ gap: spacing.xs }}>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
                  Nearest zone: {nearestDropoff.label}
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
                  Distance remaining: {formatDistanceKm(nearestDropoff.distanceKm)}
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
                  Route: {snapshot.routeLabel}
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
                  Bike ID: {bikeId}
                </Text>
              </View>
            </SurfaceCard>

            <LiveRideRoutePreview snapshot={snapshot} />
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
