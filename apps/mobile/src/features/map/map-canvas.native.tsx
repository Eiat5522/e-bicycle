import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { Bike, Coordinates } from "@glide/shared";

import { borderWidths, colors, radii, shadows, spacing } from "@/theme/tokens";

import { getBikeMarkerColor, getBikeStatusLabel } from "./marker-colors";

interface MapCanvasProps {
  readonly bikes: readonly Bike[];
  readonly bikeDistanceLabels?: Readonly<Record<string, string>>;
  readonly mapCenter: Coordinates | undefined;
  readonly onRecenter: () => void;
  readonly selectedBikeId: string | undefined;
  readonly userCoordinates: Coordinates | undefined;
  readonly onPressMarker: (bikeId: string) => void;
}

const DEFAULT_DELTA = {
  latitudeDelta: 0.03,
  longitudeDelta: 0.03
} as const;

interface BikeMarkerPinProps {
  readonly color: string;
  readonly isSelected: boolean;
}

function BikeMarkerPin({ color, isSelected }: BikeMarkerPinProps) {
  const pinSize = isSelected ? 34 : 30;
  const iconSize = isSelected ? 18 : 16;
  const pointerSize = isSelected ? 12 : 10;

  return (
    <View
      style={{
        alignItems: "center"
      }}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: color,
          borderColor: colors.background,
          borderRadius: radii.pill,
          borderWidth: borderWidths.thick,
          height: pinSize,
          justifyContent: "center",
          width: pinSize,
          ...(isSelected ? shadows.floating : shadows.button)
        }}
      >
        <MaterialIcons color={colors.text} name="pedal-bike" size={iconSize} />
      </View>
      <View
        style={{
          backgroundColor: color,
          borderBottomColor: colors.background,
          borderBottomWidth: borderWidths.thick,
          borderRightColor: colors.background,
          borderRightWidth: borderWidths.thick,
          height: pointerSize,
          marginTop: -borderWidths.thick,
          transform: [{ rotate: "45deg" }],
          width: pointerSize
        }}
      />
    </View>
  );
}

export function MapCanvas({
  bikes,
  bikeDistanceLabels,
  mapCenter,
  onRecenter,
  selectedBikeId,
  userCoordinates,
  onPressMarker
}: MapCanvasProps) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const initialCenter = mapCenter ?? bikes[0]?.coordinates;
  const initialRegion = initialCenter
    ? {
        ...initialCenter,
        ...DEFAULT_DELTA
      }
    : undefined;

  useEffect(() => {
    if (!mapCenter) {
      return;
    }

    mapRef.current?.animateToRegion(
      {
        ...mapCenter,
        ...DEFAULT_DELTA
      },
      250
    );
  }, [mapCenter]);

  return (
    <View
      style={{
        flex: 1,
        overflow: "hidden"
      }}>
      <MapView
        accessibilityLabel="Nearby bike map"
        ref={mapRef}
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
            onPress={() => onPressMarker(bike.id)}
          >
            <BikeMarkerPin
              color={getBikeMarkerColor(bike.status, bike.id === selectedBikeId)}
              isSelected={bike.id === selectedBikeId}
            />
          </Marker>
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
          bottom: insets.bottom + 92,
          left: spacing.md,
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
