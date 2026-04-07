import { colors } from "./tokens";

export const type = {
  display: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800" as const,
    color: colors.text
  },
  h1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800" as const,
    color: colors.text
  },
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800" as const,
    color: colors.text
  },
  h3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700" as const,
    color: colors.text
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "400" as const,
    color: colors.text
  },
  bodyStrong: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700" as const,
    color: colors.text
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700" as const,
    color: colors.text
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500" as const,
    color: colors.textMuted
  }
} as const;

export type TypeKey = keyof typeof type;
