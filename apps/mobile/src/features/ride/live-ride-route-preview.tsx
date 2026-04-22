import { Text, View } from "react-native";

import { formatDistanceKm } from "@glide/shared";

import { SurfaceCard } from "@/components/surface-card";
import { colors, spacing } from "@/theme/tokens";

import type { LiveRideSnapshot } from "./live-ride-tracker";

export function LiveRideRoutePreview({ snapshot }: { readonly snapshot: LiveRideSnapshot }) {
  return (
    <SurfaceCard tone="accent">
      <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
        Live route preview
      </Text>
      <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
        Web preview uses a textual fallback while the ride path is recorded for the post-ride replay.
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
