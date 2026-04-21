import { Text, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";

import { formatDistanceKm, type Coordinates } from "@glide/shared";

import { SurfaceCard } from "@/components/surface-card";
import { colors, radii } from "@/theme/tokens";

import type { LiveRideSnapshot } from "./live-ride-tracker";

const MIN_DELTA = 0.01;
const DELTA_PADDING = 1.8;

function getRegionFromRoute(route: readonly Coordinates[]) {
  const latitudes = route.map((point) => point.latitude);
  const longitudes = route.map((point) => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max((maxLatitude - minLatitude) * DELTA_PADDING, MIN_DELTA),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * DELTA_PADDING, MIN_DELTA)
  };
}

export function LiveRideRoutePreview({ snapshot }: { readonly snapshot: LiveRideSnapshot }) {
  const startPoint = snapshot.route[0];
  const currentPoint = snapshot.route.at(-1);

  if (!startPoint || !currentPoint) {
    return (
      <SurfaceCard tone="accent">
        <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
          Live route preview
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          Waiting for the first ride location point.
        </Text>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard tone="accent">
      <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
        Live route preview
      </Text>
      <View style={{ borderRadius: radii.large, height: 220, overflow: "hidden" }}>
        <MapView
          accessibilityLabel="Live ride route map"
          initialRegion={getRegionFromRoute(snapshot.route)}
          provider={PROVIDER_DEFAULT}
          style={{ flex: 1 }}
        >
          <Polyline coordinates={[...snapshot.route]} strokeColor={colors.teal} strokeWidth={5} />
          <Marker coordinate={startPoint} pinColor={colors.teal} title="Unlock" />
          <Marker coordinate={currentPoint} pinColor={colors.coralDark} title="Current position" />
        </MapView>
      </View>
      <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
        {snapshot.route.length} route points · {formatDistanceKm(snapshot.distanceKm)} recorded
      </Text>
    </SurfaceCard>
  );
}
