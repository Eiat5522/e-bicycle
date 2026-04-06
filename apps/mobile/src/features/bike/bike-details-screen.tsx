import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";

import { mockBikes } from "@glide/api";
import { formatDistanceKm } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { colors, spacing } from "@/theme/tokens";

export function BikeDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const selectedBike = mockBikes.find((bike) => bike.id === params.id);

  if (!selectedBike) {
    return (
      <ScreenShell title="Bike not found" description="The selected bike could not be resolved.">
        <SurfaceCard>
          <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
            Check the route param or return to the map to pick another ride.
          </Text>
        </SurfaceCard>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title={selectedBike.model}
      description={`${selectedBike.id} is ready to glide with ${formatDistanceKm(selectedBike.estimatedRangeKm)} of estimated range.`}>
      <SurfaceCard tone="accent">
        <Text selectable style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
          {selectedBike.pricingLabel}
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          Status: {selectedBike.status} · Location: {selectedBike.location}
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
          Vehicle details
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          Top speed: {selectedBike.topSpeedKmh} km/h
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          Ride class: {selectedBike.rideClass ?? "Unknown"}
        </Text>
      </SurfaceCard>

      <View style={{ gap: spacing.sm }}>
        <PrimaryButton
          label="Unlock and Ride"
          onPress={() => router.push(`/unlock/${selectedBike.id}`)}
        />
        <PrimaryButton
          label="Need Help?"
          onPress={() => router.push("/help")}
          variant="secondary"
        />
      </View>
    </ScreenShell>
  );
}
