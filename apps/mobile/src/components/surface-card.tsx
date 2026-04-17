import type { ReactNode } from "react";
import { View } from "react-native";

import { borderWidths, colors, radii, shadows, spacing } from "@/theme/tokens";

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
        borderColor: colors.shadow,
        borderRadius: radii.large,
        borderWidth: borderWidths.thick,
        gap: spacing.sm,
        padding: spacing.lg,
        ...shadows.card
      }}>
      {children}
    </View>
  );
}
