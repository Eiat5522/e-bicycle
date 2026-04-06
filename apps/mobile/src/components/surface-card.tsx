import type { ReactNode } from "react";
import { View } from "react-native";

import { colors, radii, spacing } from "@/theme/tokens";

interface SurfaceCardProps {
  readonly children: ReactNode;
  readonly tone?: "default" | "muted" | "accent";
}

export function SurfaceCard({
  children,
  tone = "default"
}: SurfaceCardProps) {
  const backgroundColor =
    tone === "accent"
      ? colors.yellow
      : tone === "muted"
        ? colors.surfaceMuted
        : colors.surface;

  return (
    <View
      style={{
        backgroundColor,
        borderCurve: "continuous",
        borderRadius: radii.large,
        gap: spacing.sm,
        padding: spacing.lg
      }}>
      {children}
    </View>
  );
}
