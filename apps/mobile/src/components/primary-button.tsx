import { Pressable, Text, type GestureResponderEvent } from "react-native";

import { colors, radii, spacing } from "@/theme/tokens";

interface PrimaryButtonProps {
  readonly label: string;
  readonly onPress?: (event: GestureResponderEvent) => void;
  readonly variant?: "primary" | "secondary";
  readonly disabled?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  disabled = false
}: PrimaryButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: isPrimary ? colors.coral : colors.surfaceStrong,
        borderCurve: "continuous",
        borderRadius: radii.pill,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1
      })}>
      <Text
        selectable
        style={{
          color: isPrimary ? colors.surface : colors.text,
          fontSize: 16,
          fontWeight: "700",
          textAlign: "center"
        }}>
        {label}
      </Text>
    </Pressable>
  );
}
