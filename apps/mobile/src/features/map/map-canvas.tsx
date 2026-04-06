import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import type { Bike, Coordinates } from "@glide/shared";

import { SurfaceCard } from "@/components/surface-card";
import { colors, spacing } from "@/theme/tokens";

import { getBikeMarkerColor, getBikeStatusLabel } from "./marker-colors";

interface MapCanvasProps {
  readonly bikes: readonly Bike[];
  readonly bikeDistanceLabels?: Readonly<Record<string, string>>;
  readonly onRecenter: () => void;
  readonly selectedBikeId: string | undefined;
  readonly userCoordinates: Coordinates | undefined;
  readonly onSelectBike: (bikeId: string) => void;
}

export function MapCanvas({
  bikes,
  bikeDistanceLabels,
  onRecenter,
  selectedBikeId,
  userCoordinates,
  onSelectBike
}: MapCanvasProps) {
  return (
    <SurfaceCard tone="accent">
      <View style={{ alignItems: "flex-end" }}>
        <Pressable
          accessibilityLabel="Recenter map"
          accessibilityRole="button"
          onPress={onRecenter}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.surface,
            borderRadius: 999,
            opacity: pressed ? 0.8 : 1
          })}
        >
          <MaterialIcons color={colors.text} name="my-location" size={22} />
        </Pressable>
      </View>
      <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
        Web builds keep a lightweight fallback. Current location:{" "}
        {userCoordinates
          ? `${userCoordinates.latitude.toFixed(4)}, ${userCoordinates.longitude.toFixed(4)}`
          : "unknown"}
        . Nearby bikes loaded: {bikes.length}. Selected bike: {selectedBikeId ?? "none"}.
      </Text>
      <View accessibilityLabel="Map canvas fallback" style={{ gap: spacing.xs }}>
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
                color:
                  bike.id === selectedBikeId
                    ? colors.text
                    : getBikeMarkerColor(bike.status, false),
                fontSize: 15,
                fontWeight: bike.id === selectedBikeId ? "700" : "500"
              }}
            >
              {bike.model} · {getBikeStatusLabel(bike.status)} · {bike.location} ·{" "}
              {bikeDistanceLabels?.[bike.id] ?? "Distance unavailable"}
            </Text>
          </Pressable>
        ))}
      </View>
    </SurfaceCard>
  );
}
