import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import type { Bike } from "@glide/shared";
import { formatDistanceKm } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import {
  borderWidths,
  colors,
  radii,
  shadows,
  spacing,
  typography
} from "@/theme/tokens";

import { getBikeMarkerColor, getBikeStatusLabel } from "./marker-colors";

interface BikeMarkerDrawerProps {
  readonly bike: Bike | undefined;
  readonly distanceLabel: string | undefined;
  readonly visible: boolean;
  readonly onClose: () => void;
  readonly onViewDetails: () => void;
  readonly onUnlock: () => void;
  readonly onHelp: () => void;
}

const DRAWER_HEIGHT = 360;

export function BikeMarkerDrawer({
  bike,
  distanceLabel,
  visible,
  onClose,
  onViewDetails,
  onUnlock,
  onHelp
}: BikeMarkerDrawerProps) {
  const translateY = useRef(new Animated.Value(DRAWER_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && bike) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          duration: 180,
          easing: Easing.out(Easing.ease),
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.spring(translateY, {
          damping: 20,
          mass: 0.9,
          overshootClamping: false,
          stiffness: 180,
          toValue: 0,
          useNativeDriver: true
        })
      ]).start();

      return;
    }

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        duration: 160,
        easing: Easing.in(Easing.ease),
        toValue: 0,
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        duration: 180,
        easing: Easing.in(Easing.ease),
        toValue: DRAWER_HEIGHT,
        useNativeDriver: true
      })
    ]).start();
  }, [backdropOpacity, bike, translateY, visible]);

  if (!bike) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View
          pointerEvents="none"
          style={{
            ...StyleSheet.absoluteFillObject,
            backgroundColor: "rgba(23, 23, 23, 0.36)",
            opacity: backdropOpacity
          }}
        />

        <Pressable
          accessibilityLabel="Close bike drawer"
          onPress={onClose}
          style={StyleSheet.absoluteFillObject}
        />

        <Animated.View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.shadow,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            borderWidth: borderWidths.thick,
            gap: spacing.md,
            minHeight: DRAWER_HEIGHT,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: spacing.xl,
            transform: [{ translateY }],
            ...shadows.card
          }}
        >
          <View style={{ alignItems: "center", gap: spacing.sm }}>
            <View
              style={{
                backgroundColor: colors.surfaceMuted,
                borderRadius: radii.pill,
                height: 6,
                width: 72
              }}
            />

            <View
              style={{
                alignItems: "flex-start",
                flexDirection: "row",
                justifyContent: "space-between",
                width: "100%"
              }}
            >
              <View style={{ flex: 1, gap: spacing.xs, paddingRight: spacing.md }}>
                <Text selectable style={{ ...typography.eyebrow, color: colors.teal }}>
                  Ready nearby
                </Text>
                <Text selectable style={{ ...typography.title, color: colors.text }}>
                  {bike.model}
                </Text>
                <Text selectable style={{ ...typography.body, color: colors.textMuted }}>
                  {bike.id} · {bike.location}
                </Text>
              </View>

              <Pressable
                accessibilityLabel="Dismiss bike drawer"
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => ({
                  alignItems: "center",
                  backgroundColor: colors.tealBright,
                  borderColor: colors.shadow,
                  borderRadius: radii.pill,
                  borderWidth: borderWidths.thick,
                  height: 44,
                  justifyContent: "center",
                  transform: pressed ? [{ translateX: 2 }, { translateY: 2 }] : undefined,
                  width: 44,
                  ...(pressed ? shadows.pressed : shadows.floating)
                })}
              >
                <MaterialIcons color={colors.text} name="close" size={22} />
              </Pressable>
            </View>
          </View>

          <View
            style={{
              backgroundColor: colors.surfaceStrong,
              borderColor: colors.shadow,
              borderRadius: radii.large,
              borderWidth: borderWidths.thick,
              gap: spacing.sm,
              padding: spacing.md
            }}
          >
            <Text selectable style={{ ...typography.bodyStrong, color: colors.text }}>
              {bike.pricingLabel}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
              <MetricPill
                icon="near-me"
                label={distanceLabel ?? "Distance unavailable"}
                tone={colors.tealBright}
              />
              <MetricPill
                icon="battery-full"
                label={`Range ${formatDistanceKm(bike.estimatedRangeKm)}`}
                tone={colors.white}
              />
              <MetricPill
                icon="pedal-bike"
                label={getBikeStatusLabel(bike.status)}
                tone={getBikeMarkerColor(bike.status, false)}
              />
            </View>
          </View>

          <View style={{ gap: spacing.sm }}>
            <PrimaryButton label="Unlock and Ride" onPress={onUnlock} />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="View Details" onPress={onViewDetails} variant="secondary" />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Need Help?" onPress={onHelp} variant="secondary" />
              </View>
            </View>
          </View>

          <Text selectable style={{ ...typography.body, color: colors.textMuted }}>
            {bike.rideClass ?? "Urban"} class · Top speed {bike.topSpeedKmh} km/h
          </Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface MetricPillProps {
  readonly icon: keyof typeof MaterialIcons.glyphMap;
  readonly label: string;
  readonly tone: string;
}

function MetricPill({ icon, label, tone }: MetricPillProps) {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.shadow,
        borderRadius: radii.pill,
        borderWidth: borderWidths.thick,
        flexDirection: "row",
        gap: spacing.xs,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: tone,
          borderRadius: radii.pill,
          height: 26,
          justifyContent: "center",
          width: 26
        }}
      >
        <MaterialIcons color={colors.text} name={icon} size={16} />
      </View>
      <Text selectable style={{ ...typography.label, color: colors.text }}>
        {label}
      </Text>
    </View>
  );
}
