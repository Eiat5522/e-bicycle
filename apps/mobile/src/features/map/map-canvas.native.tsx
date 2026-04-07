import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from "react-native-maps";

import type { Bike, Coordinates } from "@glide/shared";

import { BikeMarker } from "@/components/bike/bike-marker";
import { IconButton } from "@/components/ui/icon-button";
import { colors, radii, shadows, spacing } from "@/theme/tokens";

interface MapCanvasProps {
  readonly bikes: readonly Bike[];
  readonly bikeDistanceLabels?: Readonly<Record<string, string>>;
  readonly onRecenter: () => void;
  readonly selectedBikeId: string | undefined;
  readonly userCoordinates: Coordinates | undefined;
  readonly onSelectBike: (bikeId: string) => void;
}

const DEFAULT_REGION: Region = {
  latitude: 51.5072,
  longitude: -0.1276,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018
};

export function MapCanvas({
  bikes,
  onRecenter,
  selectedBikeId,
  userCoordinates,
  onSelectBike
}: MapCanvasProps) {
  const mapRef = useRef<MapView | null>(null);
  const selectedBike = useMemo(
    () => bikes.find((bike) => bike.id === selectedBikeId),
    [bikes, selectedBikeId]
  );
  const initialRegion = useMemo<Region>(() => {
    if (selectedBike) {
      return {
        latitude: selectedBike.coordinates.latitude,
        longitude: selectedBike.coordinates.longitude,
        latitudeDelta: 0.018,
        longitudeDelta: 0.018
      };
    }

    if (userCoordinates) {
      return {
        latitude: userCoordinates.latitude,
        longitude: userCoordinates.longitude,
        latitudeDelta: 0.018,
        longitudeDelta: 0.018
      };
    }

    return DEFAULT_REGION;
  }, [selectedBike, userCoordinates]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    mapRef.current.animateToRegion(initialRegion, 350);
  }, [initialRegion]);

  return (
    <View
      style={{
        flex: 1,
        borderRadius: radii.xl,
        overflow: "hidden",
        backgroundColor: colors.surface,
        ...shadows.floating
      }}
    >
      <MapView
        ref={mapRef}
        accessibilityLabel="Nearby bike map"
        provider={PROVIDER_DEFAULT}
        style={{ flex: 1 }}
        showsUserLocation={Boolean(userCoordinates)}
        showsMyLocationButton={false}
        initialRegion={initialRegion}
      >
        {bikes.map((bike) => (
          <Marker
            key={bike.id}
            coordinate={bike.coordinates}
            title={bike.model}
            description={`${bike.location} • ${bike.pricingLabel}`}
            onPress={() => onSelectBike(bike.id)}
            tracksViewChanges={false}
          >
            <BikeMarker
              selected={bike.id === selectedBikeId}
              reserved={bike.status === "reserved"}
              maintenance={bike.status === "maintenance"}
              onPress={() => onSelectBike(bike.id)}
            />
          </Marker>
        ))}
      </MapView>

      <View
        style={{
          position: "absolute",
          top: spacing.md,
          right: spacing.md
        }}
      >
        <IconButton icon="my-location" onPress={onRecenter} accessibilityLabel="Recenter map" />
      </View>
    </View>
  );
}
