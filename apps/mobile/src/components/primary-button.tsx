import {
  Pressable,
  StyleSheet,
  Text,
  type GestureResponderEvent,
  type ViewStyle
} from "react-native";

import {
  borderWidths,
  colors,
  radii,
  shadows,
  spacing,
  typography
} from "@/theme/tokens";

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
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        disabled ? styles.disabled : null,
        pressed ? styles.pressed : null,
        pressed ? shadows.pressed : shadows.button
      ]}>
      <Text
        style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderColor: colors.shadow,
    borderRadius: radii.pill,
    borderWidth: borderWidths.thick,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  primary: {
    backgroundColor: colors.coral
  },
  secondary: {
    backgroundColor: colors.tealBright
  },
  disabled: {
    opacity: 0.5
  },
  pressed: {
    transform: [{ translateX: 3 }, { translateY: 3 }]
  } satisfies ViewStyle,
  label: {
    ...typography.button,
    color: colors.text,
    textAlign: "center"
  }
});
