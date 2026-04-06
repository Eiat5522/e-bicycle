import { MaterialIcons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

import type { Bike, Coordinates } from "@glide/shared";

import { colors, radii, spacing } from "@/theme/tokens";

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
    <View style={{ height: 460, overflow: "hidden", borderRadius: radii.large }}>
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
          position: "absolute",
          top: spacing.md,
          right: spacing.md,
          width: 48,
          height: 48,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surface,
          borderRadius: radii.pill,
          opacity: pressed ? 0.8 : 1
        })}
      >
        <MaterialIcons color={colors.text} name="my-location" size={22} />
      </Pressable>
    </View>
  );
}
