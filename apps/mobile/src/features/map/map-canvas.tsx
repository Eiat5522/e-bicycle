import { Pressable, View } from "react-native";

import type { Bike, Coordinates } from "@glide/shared";

import { BikeMarker } from "@/components/bike/bike-marker";
import { SurfaceCard } from "@/components/surface-card";
import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { colors, spacing } from "@/theme/tokens";

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
    <SurfaceCard>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <AppText variant="h3">Nearby bikes</AppText>
        <IconButton icon="my-location" onPress={onRecenter} accessibilityLabel="Recenter map" />
      </View>

      <AppText variant="caption">
        Web fallback · Current location:
        {userCoordinates
          ? `${userCoordinates.latitude.toFixed(4)}, ${userCoordinates.longitude.toFixed(4)}`
          : "unknown"}
      </AppText>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        {bikes.map((bike) => {
          const selected = bike.id === selectedBikeId;
          return (
            <Pressable
              key={bike.id}
              onPress={() => onSelectBike(bike.id)}
              style={{
                minWidth: "47%",
                padding: spacing.sm,
                borderRadius: 16,
                backgroundColor: selected ? colors.surfaceMuted : colors.surface,
                borderWidth: 1,
                borderColor: colors.outline,
                gap: spacing.xs
              }}>
              <BikeMarker
                selected={selected}
                reserved={bike.status === "reserved"}
                lowBattery={bike.status === "maintenance"}
                onPress={() => onSelectBike(bike.id)}
              />
              <AppText variant="label">{bike.model}</AppText>
              <AppText variant="caption">{bike.location}</AppText>
              <AppText variant="caption">{bikeDistanceLabels?.[bike.id] ?? "Distance unavailable"}</AppText>
            </Pressable>
          );
        })}
      </View>
    </SurfaceCard>
  );
}
