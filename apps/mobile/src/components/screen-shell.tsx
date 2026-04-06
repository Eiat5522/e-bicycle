import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";

import { colors, spacing } from "@/theme/tokens";

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
      contentContainerStyle={{
        gap: spacing.lg,
        padding: spacing.lg,
        paddingBottom: spacing.xxl
      }}
      contentInsetAdjustmentBehavior="automatic">
      <View style={{ gap: spacing.sm }}>
        <Text
          selectable
          accessibilityRole="header"
          style={{
            color: colors.text,
            fontSize: 34,
            fontWeight: "800",
            letterSpacing: -0.8
          }}>
          {title}
        </Text>
        <Text
          selectable
          style={{
            color: colors.textMuted,
            fontSize: 16,
            lineHeight: 24
          }}>
          {description}
        </Text>
      </View>
      {children}
    </ScrollView>
  );
}
