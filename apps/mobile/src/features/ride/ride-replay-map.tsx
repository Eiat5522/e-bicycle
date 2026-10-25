import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import type { RideHistoryItem } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { SurfaceCard } from "@/components/surface-card";
import { colors, spacing } from "@/theme/tokens";

const REPLAY_INTERVAL_MS = 900;

interface RideReplayMapProps {
  readonly ride: RideHistoryItem;
}

function getCurrentCheckpoint(ride: RideHistoryItem, currentPointIndex: number) {
  return (
    ride.checkpoints
      .map((checkpoint) => ({
        checkpoint,
        routeIndex: ride.route.findIndex(
          (point) =>
            point.latitude === checkpoint.coordinates.latitude &&
            point.longitude === checkpoint.coordinates.longitude
        )
      }))
      .filter((entry) => entry.routeIndex >= 0)
      .filter((entry) => entry.routeIndex <= currentPointIndex)
      .at(-1)?.checkpoint ?? ride.checkpoints[0]
  );
}

export function RideReplayMap({ ride }: RideReplayMapProps) {
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

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

  const progressPercent = useMemo(() => {
    if (ride.route.length <= 1) {
      return 100;
    }

    return Math.round((currentPointIndex / (ride.route.length - 1)) * 100);
  }, [currentPointIndex, ride.route.length]);

  const currentCheckpoint = useMemo(
    () => getCurrentCheckpoint(ride, currentPointIndex) ?? initialCheckpoint,
    [currentPointIndex, initialCheckpoint, ride]
  );

  if (!currentCheckpoint) {
    return (
      <SurfaceCard tone="accent">
        <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
          Route replay
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          No replay checkpoints are available for this ride yet.
        </Text>
      </SurfaceCard>
    );
  }

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

  return (
    <SurfaceCard tone="accent">
      <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
        Route replay
      </Text>
      <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
        Web preview uses a textual fallback for the replay map. Follow the trip checkpoints below.
      </Text>
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

      <View accessibilityLabel="Ride replay fallback" style={{ gap: spacing.xs }}>
        {ride.checkpoints.map((checkpoint) => (
          <Text
            key={checkpoint.id}
            selectable
            style={{
              color:
                checkpoint.id === currentCheckpoint.id ? colors.text : colors.textMuted,
              fontSize: 15,
              fontWeight: checkpoint.id === currentCheckpoint.id ? "700" : "500"
            }}
          >
            {checkpoint.label} · {checkpoint.description}
          </Text>
        ))}
      </View>
    </SurfaceCard>
  );
}
