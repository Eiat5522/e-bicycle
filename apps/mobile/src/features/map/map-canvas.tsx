import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import type { Bike, Coordinates } from "@glide/shared";

import { SurfaceCard } from "@/components/surface-card";
import { borderWidths, colors, shadows, spacing, typography } from "@/theme/tokens";

import { getBikeMarkerColor, getBikeStatusLabel } from "./marker-colors";

interface MapCanvasProps {
  readonly bikes: readonly Bike[];
  readonly bikeDistanceLabels?: Readonly<Record<string, string>>;
  readonly onRecenter: () => void;
  readonly selectedBikeId: string | undefined;
  readonly userCoordinates: Coordinates | undefined;
  readonly onPressMarker: (bikeId: string) => void;
}

export function MapCanvas({
  bikes,
  bikeDistanceLabels,
  onRecenter,
  selectedBikeId,
  userCoordinates,
  onPressMarker
}: MapCanvasProps) {
  return (
    <SurfaceCard tone="accent">
      <View style={{ alignItems: "flex-end" }}>
        <Pressable
          accessibilityLabel="Recenter map"
          accessibilityRole="button"
          onPress={onRecenter}
          style={({ pressed }) => ({
            alignItems: "center",
            backgroundColor: colors.tealBright,
            borderColor: colors.shadow,
            borderRadius: 999,
            borderWidth: borderWidths.thick,
            height: 48,
            justifyContent: "center",
            opacity: 1,
            transform: pressed ? [{ translateX: 2 }, { translateY: 2 }] : undefined,
            width: 48,
            ...(pressed ? shadows.pressed : shadows.floating)
          })}
        >
          <MaterialIcons color={colors.text} name="my-location" size={22} />
        </Pressable>
      </View>
      <Text selectable style={{ ...typography.body, color: colors.textMuted }}>
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
            onPress={() => onPressMarker(bike.id)}
          >
            <Text
              selectable
              style={{
                ...typography.bodyStrong,
                color:
                  bike.id === selectedBikeId
                    ? colors.text
                    : getBikeMarkerColor(bike.status, false),
                fontFamily: bike.id === selectedBikeId ? typography.label.fontFamily : typography.bodyStrong.fontFamily
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
