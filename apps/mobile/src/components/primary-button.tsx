import { Pressable, Text } from "react-native";

import { colors, radii, spacing, shadows } from "@/theme/tokens";

interface PrimaryButtonProps {
  readonly label: string;
  readonly onPress?: () => void;
  readonly variant?: "primary" | "secondary" | "ghost";
  readonly disabled?: boolean;
}

export function PrimaryButton({
  label,
  onPress,
  variant = "primary",
  disabled = false
}: PrimaryButtonProps) {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: isPrimary
          ? colors.primary
          : isSecondary
            ? colors.surfaceMuted
            : "transparent",
        borderWidth: isSecondary ? 1 : 0,
        borderColor: isSecondary ? colors.outline : "transparent",
        borderRadius: radii.pill,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        opacity: disabled ? 0.45 : pressed ? 0.82 : 1,
        ...(isPrimary ? shadows.soft : null)
      })}>
      <Text
        selectable
        style={{
          color: isPrimary ? colors.surface : colors.text,
          fontSize: 16,
          lineHeight: 20,
          fontWeight: "800",
          textAlign: "center"
        }}>
        {label}
      </Text>
    </Pressable>
  );
}
