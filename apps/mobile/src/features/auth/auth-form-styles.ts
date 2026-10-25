import { borderWidths, colors, radii, shadows, spacing, typography } from "@/theme/tokens";

export const authFieldLabelStyle = {
  ...typography.label,
  color: colors.textMuted
} as const;

export const authFieldInputStyle = {
  ...typography.bodyStrong,
  backgroundColor: colors.surface,
  borderColor: colors.shadow,
  borderRadius: radii.medium,
  borderWidth: borderWidths.thick,
  color: colors.text,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  ...shadows.floating
} as const;
