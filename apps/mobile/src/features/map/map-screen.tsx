import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { mockBikes } from "@glide/api";
import { formatDistanceKm } from "@glide/shared";

import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { colors, spacing } from "@/theme/tokens";

export function MapScreen() {
  const router = useRouter();

  return (
    <ScreenShell
      title="Find a bike near you"
      description="The initial mobile scaffold mirrors the Stitch map entry point and keeps room for map SDK integration, search, and live availability.">
      <SurfaceCard tone="accent">
        <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
          Search and live map integrations are next.
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          This placeholder canvas marks where Google Maps or Mapbox will mount once the backend and
          location stack are ready.
        </Text>
      </SurfaceCard>

      <View style={{ gap: spacing.md }}>
        {mockBikes.map((bike) => (
          <Pressable
            key={bike.id}
            onPress={() => router.push(`/bike/${bike.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`View details for ${bike.model} at ${bike.location}`}
          >
            <View>
              <SurfaceCard>
                <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
                  {bike.model}
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
                  {bike.location} · {bike.batteryPercent}% battery
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
                  Range {formatDistanceKm(bike.estimatedRangeKm)} · {bike.pricingLabel}
                </Text>
              </SurfaceCard>
            </View>
          </Pressable>
        ))}
      </View>
    </ScreenShell>
  );
}
