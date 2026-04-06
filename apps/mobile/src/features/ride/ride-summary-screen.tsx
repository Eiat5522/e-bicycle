import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { mockRideSummary } from "@glide/api";
import { formatCurrency, formatDistanceKm } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { colors, spacing } from "@/theme/tokens";

export function RideSummaryScreen() {
  const router = useRouter();

  return (
    <ScreenShell
      title="Great ride, Alex!"
      description="The summary screen closes the ride loop with cost, distance, and sustainability stats inspired by the Stitch reference.">
      <SurfaceCard tone="accent">
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          Total cost
        </Text>
        <Text selectable style={{ color: colors.text, fontSize: 32, fontWeight: "800" }}>
          {formatCurrency(mockRideSummary.totalCost)}
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          Distance: {formatDistanceKm(mockRideSummary.distanceKm)}
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          CO2 saved: {mockRideSummary.co2SavedKg} kg
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          Route: {mockRideSummary.routeLabel}
        </Text>
      </SurfaceCard>

      <View style={{ gap: spacing.sm }}>
        <PrimaryButton label="Share My Trip" variant="secondary" disabled />
        <PrimaryButton label="Back to Map" onPress={() => router.replace("/(tabs)")} />
      </View>
    </ScreenShell>
  );
}
