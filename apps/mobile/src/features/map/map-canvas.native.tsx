import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

import type { Bike, Coordinates } from "@glide/shared";

import { borderWidths, colors, radii, shadows, spacing } from "@/theme/tokens";

import { getBikeMarkerColor, getBikeStatusLabel } from "./marker-colors";

interface MapCanvasProps {
  readonly bikes: readonly Bike[];
  readonly bikeDistanceLabels?: Readonly<Record<string, string>>;
  readonly onRecenter: () => void;
  readonly selectedBikeId: string | undefined;
  readonly userCoordinates: Coordinates | undefined;
  readonly onSelectBike: (bikeId: string) => void;
}

const DEFAULT_DELTA = {
  latitudeDelta: 0.03,
  longitudeDelta: 0.03
} as const;

export function MapCanvas({
  bikes,
  bikeDistanceLabels,
  onRecenter,
  selectedBikeId,
  userCoordinates,
  onSelectBike
}: MapCanvasProps) {
  const initialCenter = userCoordinates ?? bikes[0]?.coordinates;
  const initialRegion = initialCenter
    ? {
        ...initialCenter,
        ...DEFAULT_DELTA
      }
    : undefined;

  return (
    <View
      style={{
        borderColor: colors.shadow,
        borderRadius: radii.large,
        borderWidth: borderWidths.thick,
        height: 460,
        overflow: "hidden",
        ...shadows.card
      }}>
      <MapView
        accessibilityLabel="Nearby bike map"
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        showsUserLocation={Boolean(userCoordinates)}
        showsMyLocationButton={false}
        {...(initialRegion ? { initialRegion } : {})}
      >
        {bikes.map((bike) => (
          <Marker
            key={bike.id}
            coordinate={bike.coordinates}
            title={bike.model}
            description={`${getBikeStatusLabel(bike.status)} • ${bike.location} • ${bikeDistanceLabels?.[bike.id] ?? "Distance unavailable"} • ${bike.pricingLabel}`}
            pinColor={getBikeMarkerColor(bike.status, bike.id === selectedBikeId)}
            onPress={() => onSelectBike(bike.id)}
          />
        ))}
      </MapView>

      <Pressable
        accessibilityLabel="Recenter map"
        accessibilityRole="button"
        onPress={onRecenter}
        style={({ pressed }) => ({
          alignItems: "center",
          backgroundColor: colors.tealBright,
          borderColor: colors.shadow,
          borderRadius: radii.pill,
          borderWidth: borderWidths.thick,
          height: 48,
          justifyContent: "center",
          position: "absolute",
          right: spacing.md,
          top: spacing.md,
          transform: pressed ? [{ translateX: 2 }, { translateY: 2 }] : undefined,
          width: 48,
          ...(pressed ? shadows.pressed : shadows.floating)
        })}
      >
        <MaterialIcons color={colors.text} name="my-location" size={22} />
      </Pressable>
    </View>
  );
}
