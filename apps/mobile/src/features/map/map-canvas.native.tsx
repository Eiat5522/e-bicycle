import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";

import type { Bike, Coordinates } from "@glide/shared";

import { radii } from "@/theme/tokens";

interface MapCanvasProps {
  readonly bikes: readonly Bike[];
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
    <MapView
      accessibilityLabel="Nearby bike map"
      provider={PROVIDER_DEFAULT}
      style={{ height: 360, borderRadius: radii.large }}
      showsUserLocation={Boolean(userCoordinates)}
      showsMyLocationButton
      {...(initialRegion ? { initialRegion } : {})}
    >
      {bikes.map((bike) => (
        <Marker
          key={bike.id}
          coordinate={bike.coordinates}
          title={bike.model}
          description={`${bike.location} • ${bike.pricingLabel}`}
          pinColor={bike.id === selectedBikeId ? "#fe7e4f" : "#006668"}
          onPress={() => onSelectBike(bike.id)}
        />
      ))}
    </MapView>
  );
}
