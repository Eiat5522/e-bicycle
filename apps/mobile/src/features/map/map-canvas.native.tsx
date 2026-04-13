import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Pressable, type ViewStyle, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from "react-native-maps";
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
  readonly onPressMarker: (bikeId: string, status: Bike["status"]) => void;
}

const DEFAULT_DELTA = {
  latitudeDelta: 0.03,
  longitudeDelta: 0.03
} as const;
const TAB_BAR_HEIGHT = 52;
const TAB_BAR_OUTER_MARGIN = spacing.xs;
const MAP_CONTROLS_BOTTOM_GAP = spacing.sm;
const MAP_CONTROL_BUTTON_SIZE = 48;
const ZOOM_CONTROL_BUTTON_SIZE = 44;
const RECENTER_BUTTON_GAP = spacing.xs;
const MIN_LATITUDE_DELTA = 0.003;
const MAX_LATITUDE_DELTA = 0.18;
const ZOOM_STEP = 0.55;

const pressedButtonStyle = {
  transform: [{ translateX: 2 }, { translateY: 2 }]
} satisfies ViewStyle;

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

interface MapControlButtonProps {
  readonly icon: keyof typeof MaterialIcons.glyphMap;
  readonly accessibilityLabel: string;
  readonly onPress: () => void;
}

function MapControlButton({ icon, accessibilityLabel, onPress }: MapControlButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        {
          alignItems: "center",
          backgroundColor: colors.surface,
          height: 44,
          justifyContent: "center",
          width: 44
        },
        pressed ? { backgroundColor: colors.surfaceMuted } : null
      ]}
    >
      <MaterialIcons color={colors.text} name={icon} size={22} />
    </Pressable>
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
  const regionRef = useRef<Region | undefined>(initialRegion);
  const zoomControlsBottom =
    insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_OUTER_MARGIN - MAP_CONTROLS_BOTTOM_GAP;
  const zoomControlsHeight =
    ZOOM_CONTROL_BUTTON_SIZE * 2 + borderWidths.thin + borderWidths.thick * 2;
  const recenterButtonBottom = zoomControlsBottom + zoomControlsHeight + RECENTER_BUTTON_GAP;

  useEffect(() => {
    if (!mapCenter) {
      return;
    }

    const nextRegion = {
      ...mapCenter,
      latitudeDelta: regionRef.current?.latitudeDelta ?? DEFAULT_DELTA.latitudeDelta,
      longitudeDelta: regionRef.current?.longitudeDelta ?? DEFAULT_DELTA.longitudeDelta
    };

    regionRef.current = nextRegion;
    mapRef.current?.animateToRegion(nextRegion, 250);
  }, [mapCenter]);

  const handleRegionChangeComplete = (region: Region) => {
    regionRef.current = region;
  };

  const handleZoom = (direction: "in" | "out") => {
    const region = regionRef.current;

    if (!region) {
      return;
    }

    const zoomFactor = direction === "in" ? ZOOM_STEP : 1 / ZOOM_STEP;
    const latitudeDelta = Math.min(
      MAX_LATITUDE_DELTA,
      Math.max(MIN_LATITUDE_DELTA, region.latitudeDelta * zoomFactor)
    );
    const longitudeDelta = Math.min(
      MAX_LATITUDE_DELTA,
      Math.max(MIN_LATITUDE_DELTA, region.longitudeDelta * zoomFactor)
    );

    const nextRegion = {
      ...region,
      latitudeDelta,
      longitudeDelta
    };

    regionRef.current = nextRegion;
    mapRef.current?.animateToRegion(nextRegion, 180);
  };

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
        onRegionChangeComplete={handleRegionChangeComplete}
        {...(initialRegion ? { initialRegion } : {})}
      >
        {bikes.map((bike) => (
          <Marker
            key={bike.id}
            coordinate={bike.coordinates}
            title={bike.model}
            description={`${getBikeStatusLabel(bike.status)} • ${bike.location} • ${bikeDistanceLabels?.[bike.id] ?? "Distance unavailable"} • ${bike.pricingLabel}`}
            onPress={() => onPressMarker(bike.id, bike.status)}
          >
            <BikeMarkerPin
              color={getBikeMarkerColor(bike.status, bike.id === selectedBikeId)}
              isSelected={bike.id === selectedBikeId}
            />
          </Marker>
        ))}
      </MapView>

      <View
        pointerEvents="box-none"
        style={{
          bottom: zoomControlsBottom,
          left: spacing.md,
          position: "absolute",
          backgroundColor: colors.surface,
          borderColor: colors.shadow,
          borderRadius: radii.pill,
          borderWidth: borderWidths.thick,
          overflow: "hidden",
          ...shadows.floating
        }}
      >
        <MapControlButton
          accessibilityLabel="Zoom in"
          icon="add"
          onPress={() => handleZoom("in")}
        />
        <View style={{ height: borderWidths.thin, backgroundColor: colors.shadow, marginHorizontal: spacing.xxs }} />
        <MapControlButton
          accessibilityLabel="Zoom out"
          icon="remove"
          onPress={() => handleZoom("out")}
        />
      </View>

      <Pressable
        accessibilityLabel="Recenter map"
        accessibilityRole="button"
        onPress={onRecenter}
        style={({ pressed }) => [
          {
            alignItems: "center",
            backgroundColor: colors.tealBright,
            borderColor: colors.shadow,
            borderRadius: radii.pill,
            borderWidth: borderWidths.thick,
            bottom: recenterButtonBottom,
            height: MAP_CONTROL_BUTTON_SIZE,
            justifyContent: "center",
            left: spacing.md,
            position: "absolute",
            width: MAP_CONTROL_BUTTON_SIZE
          },
          pressed ? pressedButtonStyle : null,
          pressed ? shadows.pressed : shadows.floating
        ]}
      >
        <MaterialIcons color={colors.text} name="my-location" size={22} />
      </Pressable>
    </View>
  );
}
