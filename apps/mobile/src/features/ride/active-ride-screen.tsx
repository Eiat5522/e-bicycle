import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { mockActiveRide } from "@glide/api";
import { formatCurrency, formatDistanceKm, formatDuration } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { colors, spacing } from "@/theme/tokens";

export function ActiveRideScreen() {
  const router = useRouter();

  return (
    <ScreenShell
      title="Glide Ride Dashboard"
      description="This route holds the live trip state, fare estimate, and ride controls for the core rental loop.">
      <View style={{ gap: spacing.md }}>
        <SurfaceCard tone="accent">
          <Text selectable style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
            Ride time
          </Text>
          <Text selectable style={{ color: colors.text, fontSize: 28, fontWeight: "800" }}>
            {formatDuration(mockActiveRide.durationSec)}
          </Text>
        </SurfaceCard>

        <SurfaceCard>
          <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
            Current cost: {formatCurrency(mockActiveRide.currentCost)}
          </Text>
          <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
            Distance: {formatDistanceKm(mockActiveRide.distanceKm)}
          </Text>
          {mockActiveRide.nextDropoffZoneKm !== undefined ? (
            <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
              Next dropoff zone: {formatDistanceKm(mockActiveRide.nextDropoffZoneKm)}
            </Text>
          ) : null}
        </SurfaceCard>
      </View>

      <View style={{ gap: spacing.sm }}>
        <PrimaryButton label="Pause Ride" variant="secondary" disabled />
        <PrimaryButton label="End Ride" onPress={() => router.push("/ride/summary")} />
      </View>
    </ScreenShell>
  );
}
