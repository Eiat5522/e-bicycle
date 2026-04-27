import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
  View
} from "react-native";

import type { Bike } from "@glide/shared";

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
  readonly canUnlock: boolean;
  readonly statusMessage: string | undefined;
  readonly unlockDisabledMessage: string | undefined;
  readonly onClose: () => void;
  readonly onNavigate: () => void;
  readonly onViewDetails: () => void;
  readonly onUnlock: () => void;
  readonly onHelp: () => void;
}

const DRAWER_HEIGHT = 500;
const pressedIconButtonStyle = {
  transform: [{ translateX: 2 }, { translateY: 2 }]
} satisfies ViewStyle;

function getBatteryEstimate(rangeKm: number) {
  return Math.max(18, Math.min(100, Math.round((rangeKm / 50) * 100)));
}

export function BikeMarkerDrawer({
  bike,
  distanceLabel,
  visible,
  canUnlock,
  statusMessage,
  unlockDisabledMessage,
  onClose,
  onNavigate,
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

  const batteryEstimate = getBatteryEstimate(bike.estimatedRangeKm);
  const statusTone = getBikeMarkerColor(bike.status, false, false);

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
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "space-between",
                width: "100%"
              }}
            >
              <Text selectable style={{ ...typography.eyebrow, color: statusTone }}>
                {statusMessage ?? "Ready to rent"}
              </Text>

              <Pressable
                accessibilityLabel="Dismiss bike drawer"
                accessibilityRole="button"
                onPress={onClose}
                style={({ pressed }) => [
                  {
                    alignItems: "center",
                    backgroundColor: colors.tealBright,
                    borderColor: colors.shadow,
                    borderRadius: radii.pill,
                    borderWidth: borderWidths.thick,
                    height: 44,
                    justifyContent: "center",
                    width: 44
                  },
                  pressed ? pressedIconButtonStyle : null,
                  pressed ? shadows.pressed : shadows.floating
                ]}
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
              flexDirection: "row",
              gap: spacing.md,
              overflow: "hidden",
              padding: spacing.sm
            }}
          >
            {bike.imageUrl ? (
              <Image
                accessibilityLabel={`${bike.model} photo`}
                source={{ uri: bike.imageUrl }}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 22,
                  height: 108,
                  width: 108
                }}
              />
            ) : (
              <View
                accessibilityLabel={`${bike.model} placeholder`}
                style={{
                  alignItems: "center",
                  backgroundColor: colors.surface,
                  borderColor: colors.shadow,
                  borderRadius: 22,
                  borderWidth: borderWidths.thick,
                  height: 108,
                  justifyContent: "center",
                  width: 108
                }}
              >
                <MaterialIcons color={colors.teal} name="pedal-bike" size={42} />
              </View>
            )}

            <View style={{ flex: 1, gap: spacing.xs, justifyContent: "space-between" }}>
              <View style={{ gap: spacing.xxs }}>
                <Text selectable style={{ ...typography.title, color: colors.text }}>
                  {bike.model}
                </Text>
                <Text selectable style={{ ...typography.body, color: colors.textMuted }}>
                  {bike.id} · {bike.location}
                </Text>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                <MetricPill
                  icon="pedal-bike"
                  label={getBikeStatusLabel(bike.status)}
                  tone={statusTone}
                />
                <MetricPill
                  icon="near-me"
                  label={distanceLabel ?? "Distance unavailable"}
                  tone={colors.tealBright}
                />
              </View>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <StatCard
              icon="battery-full"
              label="Battery"
              value={`${batteryEstimate}%`}
              detail={`${bike.estimatedRangeKm} km range`}
            />
            <StatCard
              icon="bolt"
              label="Top speed"
              value={`${bike.topSpeedKmh}`}
              detail="km/h"
            />
          </View>

          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <PriceCard
              accent={colors.teal}
              label="Unlock"
              value={bike.pricingLabel}
              detail={`${bike.rideClass ?? "Urban"} class`}
            />
            <PriceCard
              accent={colors.coral}
              label="Pickup"
              value="Ready now"
              detail="No reservation queue"
            />
          </View>

          <View style={{ gap: spacing.sm }}>
            <PrimaryButton label="Unlock and Ride" onPress={onUnlock} disabled={!canUnlock} />
            <PrimaryButton label="Navigate to" onPress={onNavigate} variant="secondary" />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="View Details" onPress={onViewDetails} variant="secondary" />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Need Help?" onPress={onHelp} variant="secondary" />
              </View>
            </View>
            {!canUnlock ? (
              <Text
                selectable
                style={{ color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.xs }}
              >
                {unlockDisabledMessage ?? "This bike cannot be unlocked right now."}
              </Text>
            ) : null}
          </View>
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
        <MaterialIcons color={colors.text} name={icon} size={14} />
      </View>
      <Text selectable style={{ ...typography.label, color: colors.text }}>
        {label}
      </Text>
    </View>
  );
}

interface StatCardProps {
  readonly icon: keyof typeof MaterialIcons.glyphMap;
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}

function StatCard({ icon, label, value, detail }: StatCardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.shadow,
        borderRadius: radii.large,
        borderWidth: borderWidths.thick,
        flex: 1,
        gap: spacing.xxs,
        padding: spacing.md
      }}
    >
      <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.xs }}>
        <MaterialIcons color={colors.teal} name={icon} size={18} />
        <Text selectable style={{ ...typography.eyebrow, color: colors.textMuted }}>
          {label}
        </Text>
      </View>
      <Text selectable style={{ ...typography.title, color: colors.text }}>
        {value}
      </Text>
      <Text selectable style={{ ...typography.body, color: colors.textMuted }}>
        {detail}
      </Text>
    </View>
  );
}

interface PriceCardProps {
  readonly accent: string;
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}

function PriceCard({ accent, label, value, detail }: PriceCardProps) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.shadow,
        borderRadius: radii.large,
        borderWidth: borderWidths.thick,
        flex: 1,
        gap: spacing.xxs,
        padding: spacing.md
      }}
    >
      <Text selectable style={{ ...typography.eyebrow, color: accent }}>
        {label}
      </Text>
      <Text selectable style={{ ...typography.bodyStrong, color: colors.text }}>
        {value}
      </Text>
      <Text selectable style={{ ...typography.body, color: colors.textMuted }}>
        {detail}
      </Text>
    </View>
  );
}
