import { Text, View } from "react-native";

import { formatDistanceKm } from "@glide/shared";

import { SurfaceCard } from "@/components/surface-card";
import { colors, spacing } from "@/theme/tokens";

import type { LiveRideDropoffGuidance, LiveRideSnapshot } from "./live-ride-tracker";

export function LiveRideRoutePreview({
  snapshot,
  dropoffGuidance
}: {
  readonly snapshot: LiveRideSnapshot;
  readonly dropoffGuidance: LiveRideDropoffGuidance;
}) {
  return (
    <SurfaceCard tone="accent">
      <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
        Live route preview
      </Text>
      <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
        Web preview uses a textual fallback while the ride path is recorded for the post-ride replay.
      </Text>
      <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
        Destination: {dropoffGuidance.zone.label}
      </Text>
      <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
        Guidance state: {dropoffGuidance.state.replace(/_/g, " ")}
      </Text>
      <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
        Route points: {snapshot.route.length}
      </Text>
      <View accessibilityLabel="Live route fallback" style={{ gap: spacing.xs }}>
        {snapshot.checkpoints.map((checkpoint) => (
          <Text
            key={checkpoint.id}
            selectable
            style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}
          >
            {checkpoint.label} · {checkpoint.description}
          </Text>
        ))}
      </View>
      <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
        Recorded distance: {formatDistanceKm(snapshot.distanceKm)}
      </Text>
    </SurfaceCard>
  );
}
