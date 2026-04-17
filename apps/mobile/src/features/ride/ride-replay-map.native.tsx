import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";

import type { Coordinates, RideHistoryItem } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { SurfaceCard } from "@/components/surface-card";
import { colors, radii } from "@/theme/tokens";

const REPLAY_INTERVAL_MS = 900;
const MIN_DELTA = 0.01;
const DELTA_PADDING = 1.8;

interface RideReplayMapProps {
  readonly ride: RideHistoryItem;
}

function getRegionFromRoute(route: RideHistoryItem["route"]) {
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

const COORDINATE_EPSILON = 1e-9;

function findRouteIndex(route: RideHistoryItem["route"], coordinates: Coordinates) {
  return route.findIndex(
    (point) =>
      Math.abs(point.latitude - coordinates.latitude) < COORDINATE_EPSILON &&
      Math.abs(point.longitude - coordinates.longitude) < COORDINATE_EPSILON
  );
}

function getCurrentCheckpoint(ride: RideHistoryItem, currentPointIndex: number) {
  const matchedCheckpoint = ride.checkpoints
    .map((checkpoint) => ({
      checkpoint,
      idx: findRouteIndex(ride.route, checkpoint.coordinates)
    }))
    .filter(({ idx }) => idx !== -1 && idx <= currentPointIndex)
    .at(-1)?.checkpoint;

  return matchedCheckpoint ?? ride.checkpoints[0];
}

export function RideReplayMap({ ride }: RideReplayMapProps) {
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const startPoint = ride.route[0];
  const initialCheckpoint = ride.checkpoints[0];

  useEffect(() => {
    setCurrentPointIndex(0);
    setIsPlaying(false);
  }, [ride.id]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    if (currentPointIndex >= ride.route.length - 1) {
      setIsPlaying(false);
      return;
    }

    const intervalId = setInterval(() => {
      setCurrentPointIndex((currentIndex) =>
        currentIndex >= ride.route.length - 1 ? currentIndex : currentIndex + 1
      );
    }, REPLAY_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [currentPointIndex, isPlaying, ride.route.length]);

  const region = useMemo(
    () =>
      startPoint
        ? getRegionFromRoute(ride.route)
        : {
            latitude: 0,
            longitude: 0,
            latitudeDelta: MIN_DELTA,
            longitudeDelta: MIN_DELTA
          },
    [ride.route, startPoint]
  );
  const replayCoordinates = useMemo(() => ride.route.map((point) => ({ ...point })), [ride.route]);
  const endPoint = ride.route[ride.route.length - 1] ?? startPoint;
  const currentPoint = ride.route[currentPointIndex] ?? startPoint;
  const currentCheckpoint = useMemo(
    () => getCurrentCheckpoint(ride, currentPointIndex) ?? initialCheckpoint,
    [currentPointIndex, initialCheckpoint, ride]
  );

  const progressPercent = useMemo(() => {
    if (ride.route.length <= 1) {
      return 100;
    }

    return Math.round((currentPointIndex / (ride.route.length - 1)) * 100);
  }, [currentPointIndex, ride.route.length]);

  const controlLabel =
    isPlaying ? "Pause replay" : currentPointIndex >= ride.route.length - 1 ? "Replay route" : "Play replay";

  function handleTogglePlayback() {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }

    if (currentPointIndex >= ride.route.length - 1) {
      setCurrentPointIndex(0);
    }

    setIsPlaying(true);
  }

  if (!startPoint || !endPoint || !currentPoint || !currentCheckpoint) {
    return (
      <SurfaceCard tone="accent">
        <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
          Route replay
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          No replay data is available for this ride yet.
        </Text>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard tone="accent">
      <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
        Route replay
      </Text>
      <View style={{ height: 280, overflow: "hidden", borderRadius: radii.large }}>
        <MapView
          accessibilityLabel="Ride replay map"
          initialRegion={region}
          provider={PROVIDER_DEFAULT}
          style={{ flex: 1 }}
        >
          <Polyline coordinates={replayCoordinates} strokeColor={colors.teal} strokeWidth={5} />
          <Marker coordinate={startPoint} pinColor={colors.teal} title="Start" />
          <Marker coordinate={endPoint} pinColor={colors.coralDark} title="Finish" />
          <Marker coordinate={currentPoint} pinColor={colors.coral} title="Replay position" />
        </MapView>
      </View>
      <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
        Replay progress: {progressPercent}%
      </Text>
      <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
        {currentCheckpoint.label}
      </Text>
      <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
        {currentCheckpoint.description}
      </Text>
      <PrimaryButton label={controlLabel} onPress={handleTogglePlayback} />
    </SurfaceCard>
  );
}
