import { Pressable, Text, View } from "react-native";

import type { Bike, Coordinates } from "@glide/shared";

import { SurfaceCard } from "@/components/surface-card";
import { colors } from "@/theme/tokens";

interface MapCanvasProps {
  readonly bikes: readonly Bike[];
  readonly selectedBikeId: string | undefined;
  readonly userCoordinates: Coordinates | undefined;
  readonly onSelectBike: (bikeId: string) => void;
}

export function MapCanvas({
  bikes,
  selectedBikeId,
  userCoordinates,
  onSelectBike
}: MapCanvasProps) {
  return (
    <SurfaceCard tone="accent">
      <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
        Map preview is available on iOS and Android.
      </Text>
      <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
        Web builds keep a lightweight fallback. Current location:{" "}
        {userCoordinates
          ? `${userCoordinates.latitude.toFixed(4)}, ${userCoordinates.longitude.toFixed(4)}`
          : "unknown"}
        . Nearby bikes loaded: {bikes.length}. Selected bike: {selectedBikeId ?? "none"}.
      </Text>
      <View accessibilityLabel="Map canvas fallback" style={{ gap: 8 }}>
        {bikes.map((bike) => (
          <Pressable
            key={bike.id}
            accessibilityRole="button"
            accessibilityLabel={`Select ${bike.model}`}
            onPress={() => onSelectBike(bike.id)}
          >
            <Text
              selectable
              style={{
                color: bike.id === selectedBikeId ? colors.text : colors.textMuted,
                fontSize: 15,
                fontWeight: bike.id === selectedBikeId ? "700" : "500"
              }}
            >
              {bike.model} · {bike.location}
            </Text>
          </Pressable>
        ))}
      </View>
    </SurfaceCard>
  );
}
