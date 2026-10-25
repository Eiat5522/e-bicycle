import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";

import {
  borderWidths,
  colors,
  radii,
  shadows,
  spacing,
  typography
} from "@/theme/tokens";

interface ScreenShellProps {
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}

export function ScreenShell({
  title,
  description,
  children
}: ScreenShellProps) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        gap: spacing.lg,
        padding: spacing.lg,
        paddingBottom: spacing.xxl
      }}
      contentInsetAdjustmentBehavior="automatic">
      <View style={{ gap: spacing.sm }}>
        <Text
          selectable
          style={{
            ...typography.eyebrow,
            alignSelf: "flex-start",
            backgroundColor: colors.tealBright,
            borderColor: colors.shadow,
            borderRadius: radii.pill,
            borderWidth: borderWidths.thick,
            color: colors.text,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.xs,
            ...shadows.floating
          }}>
          Glide city rides
        </Text>
        <Text
          selectable
          accessibilityRole="header"
          style={{
            color: colors.text,
            ...typography.hero
          }}>
          {title}
        </Text>
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.shadow,
            borderRadius: radii.large,
            borderWidth: borderWidths.thick,
            padding: spacing.md,
            ...shadows.floating
          }}>
          <Text
            selectable
            style={{
              ...typography.body,
              color: colors.textMuted
            }}>
            {description}
          </Text>
        </View>
      </View>
      {children}
    </ScrollView>
  );
}
