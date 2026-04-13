import { borderWidths, colors, radii, spacing } from "@/theme/tokens";

const TAB_BAR_HEIGHT = 56;
const TAB_BAR_TOP_PADDING = 2;
const TAB_BAR_BOTTOM_PADDING = 4;
const TAB_BAR_OUTER_MARGIN = spacing.xs;

export function getTabBarStyle(bottomInset: number) {
  const safeAreaBottom = Math.max(bottomInset, 0);

  return {
    backgroundColor: colors.surface,
    borderColor: colors.shadow,
    borderRadius: radii.large,
    borderWidth: borderWidths.thick,
    borderTopWidth: borderWidths.thick + 2,
    height: TAB_BAR_HEIGHT + safeAreaBottom,
    marginBottom: TAB_BAR_OUTER_MARGIN,
    marginHorizontal: spacing.xs,
    paddingBottom: TAB_BAR_BOTTOM_PADDING + safeAreaBottom,
    paddingHorizontal: spacing.xxs,
    paddingTop: TAB_BAR_TOP_PADDING
  } as const;
}
