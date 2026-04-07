import { MaterialIcons } from "@expo/vector-icons";
import { Pressable } from "react-native";

import { colors, radii, shadows, sizes } from "@/theme/tokens";

interface IconButtonProps {
  readonly icon: keyof typeof MaterialIcons.glyphMap;
  readonly onPress: () => void;
  readonly accessibilityLabel: string;
}

export function IconButton({ icon, onPress, accessibilityLabel }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        width: sizes.mapActionButton,
        height: sizes.mapActionButton,
        borderRadius: radii.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.surface,
        opacity: pressed ? 0.82 : 1,
        ...shadows.soft
      })}
    >
      <MaterialIcons name={icon} size={22} color={colors.text} />
    </Pressable>
  );
}
