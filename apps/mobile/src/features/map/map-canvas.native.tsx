import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";

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

const defaultRegion: Region = {
  latitude: 51.5072,
  longitude: -0.1276,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018
};

export function MapCanvas({ bikes, onRecenter, selectedBikeId, userCoordinates, onSelectBike }: MapCanvasProps) {
  const mapRef = useRef<MapView | null>(null);

  const initialRegion = useMemo<Region>(() => {
    if (!userCoordinates) {
      return defaultRegion;
    }

    return {
      latitude: userCoordinates.latitude,
      longitude: userCoordinates.longitude,
      latitudeDelta: 0.018,
      longitudeDelta: 0.018
    };
  }, [userCoordinates]);

  useEffect(() => {
    if (!mapRef.current || !userCoordinates) {
      return;
    }

    mapRef.current.animateToRegion(initialRegion, 350);
  }, [initialRegion, userCoordinates]);

  return (
    <View
      style={{
        height: 420,
        borderRadius: radii.xl,
        overflow: "hidden",
        backgroundColor: colors.surface,
        ...shadows.floating
      }}>
      <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={initialRegion} showsUserLocation>
        {bikes.map((bike) => {
          const selected = bike.id === selectedBikeId;
          return (
            <Marker
              key={bike.id}
              coordinate={{
                latitude: bike.coordinates.latitude,
                longitude: bike.coordinates.longitude
              }}
              onPress={() => onSelectBike(bike.id)}
              tracksViewChanges={false}>
              <BikeMarker
                selected={selected}
                reserved={bike.status === "reserved"}
                lowBattery={bike.status === "maintenance"}
                onPress={() => onSelectBike(bike.id)}
              />
            </Marker>
          );
        })}
      </MapView>

      <View
        style={{
          position: "absolute",
          top: spacing.md,
          right: spacing.md
        }}>
        <IconButton icon="my-location" onPress={onRecenter} accessibilityLabel="Recenter map" />
      </View>
    </View>
  );
}
