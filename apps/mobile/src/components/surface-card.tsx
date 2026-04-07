import type { ReactNode } from "react";
import { View } from "react-native";

import { colors, radii, spacing, shadows } from "@/theme/tokens";

interface SurfaceCardProps {
  readonly children: ReactNode;
  readonly tone?: "default" | "muted" | "accent" | "success";
}

export function SurfaceCard({ children, tone = "default" }: SurfaceCardProps) {
  const backgroundColor =
    tone === "accent"
      ? colors.yellow
      : tone === "muted"
        ? colors.surfaceMuted
        : tone === "success"
          ? "#E9F8EF"
          : colors.surface;

  return (
    <View
      style={{
        backgroundColor,
        borderRadius: radii.large,
        gap: spacing.sm,
        padding: spacing.lg,
        ...shadows.soft
      }}>
      {children}
    </View>
  );
}
