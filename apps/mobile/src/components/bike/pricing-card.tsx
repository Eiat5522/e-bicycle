import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { colors, radii, spacing } from "@/theme/tokens";

interface PricingCardProps {
  readonly title: string;
  readonly price: string;
  readonly subtitle: string;
  readonly featured?: boolean;
}

export function PricingCard({ title, price, subtitle, featured = false }: PricingCardProps) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 104,
        borderRadius: radii.medium,
        padding: spacing.md,
        gap: spacing.xs,
        backgroundColor: colors.surface,
        borderWidth: featured ? 2 : 1,
        borderColor: featured ? colors.primary : colors.outline
      }}>
      <AppText variant="label">{title}</AppText>
      <AppText variant="h3">{price}</AppText>
      <AppText variant="caption">{subtitle}</AppText>
    </View>
  );
}
