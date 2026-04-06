import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";

import { mockActiveRide } from "@glide/api";
import { formatCurrency, formatDistanceKm, formatDuration } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { colors, radii, spacing } from "@/theme/tokens";

const isTestEnvironment = process.env.NODE_ENV === "test";
const ARRIVAL_OVERLAY_MS = 1600;

export function ActiveRideScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bikeId?: string; entry?: string }>();
  const bikeId = params.bikeId ?? mockActiveRide.bikeId;
  const enteredFromUnlock = params.entry === "unlock";
  const [showArrivalOverlay, setShowArrivalOverlay] = useState(enteredFromUnlock);
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

  return (
    <>
      <ScreenShell
        title="Glide Ride Dashboard"
        description="The ride is live. This screen now stages the unlock handoff, live fare, and route guidance like a proper in-motion dashboard.">
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
                backgroundColor: "rgba(93, 251, 254, 0.28)",
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
                backgroundColor: "rgba(255, 215, 9, 0.18)",
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
                  letterSpacing: -0.8
                }}>
                {bikeId} is unlocked and moving
              </Text>
              <Text
                selectable
                style={{
                  color: "rgba(255, 255, 255, 0.82)",
                  fontSize: 15,
                  lineHeight: 22
                }}>
                Cruise mode is active, billing is running, and the next safe drop zone is already tracked.
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
                  {formatDuration(mockActiveRide.durationSec)}
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
                  {formatCurrency(mockActiveRide.currentCost)}
                </Text>
              </View>
            </View>
          </View>

          <View style={{ gap: spacing.md }}>
            <SurfaceCard tone="accent">
              <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                Ride corridor
              </Text>
              <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                You have already covered {formatDistanceKm(mockActiveRide.distanceKm)}. Keep heading toward the highlighted drop zone to end cleanly.
              </Text>
              {mockActiveRide.nextDropoffZoneKm !== undefined ? (
                <Text selectable style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
                  Next dropoff zone: {formatDistanceKm(mockActiveRide.nextDropoffZoneKm)}
                </Text>
              ) : null}
            </SurfaceCard>

            <SurfaceCard>
              <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                Ride telemetry
              </Text>
              <View style={{ gap: spacing.xs }}>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
                  Current cost: {formatCurrency(mockActiveRide.currentCost)}
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
                  Distance: {formatDistanceKm(mockActiveRide.distanceKm)}
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
                  Session ID: {mockActiveRide.id}
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
                  Bike ID: {bikeId}
                </Text>
              </View>
            </SurfaceCard>
          </View>
        </Animated.View>

        <View style={{ gap: spacing.sm }}>
          <PrimaryButton label="Pause Ride" variant="secondary" disabled />
          <PrimaryButton label="End Ride" onPress={() => router.push("/ride/summary")} />
        </View>
      </ScreenShell>

      {showArrivalOverlay ? (
        <Animated.View
          pointerEvents="none"
          style={{
            alignItems: "center",
            backgroundColor: "rgba(0, 102, 104, 0.92)",
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
              <Text selectable style={{ color: colors.yellow, fontSize: 46, fontWeight: "800" }}>
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
