import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { colors, radii, spacing } from "@/theme/tokens";

interface ChipProps {
  readonly label: string;
  readonly active?: boolean;
  readonly onPress?: () => void;
}

export function Chip({ label, active = false, onPress }: ChipProps) {
  const content = (
    <View
      style={{
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radii.pill,
        backgroundColor: active ? colors.text : colors.surfaceMuted,
        borderWidth: 1,
        borderColor: active ? colors.text : colors.outline
      }}>
      <AppText variant="label" color={active ? colors.surface : colors.text}>
        {label}
      </AppText>
    </View>
  );

  if (!onPress) {
    return content;
  }

  return <Pressable onPress={onPress}>{content}</Pressable>;
}
