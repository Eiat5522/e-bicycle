export const colors = {
  background: "#f7efe2",
  surface: "#fffaf1",
  surfaceMuted: "#f3dfb8",
  surfaceStrong: "#ffd24d",
  coral: "#ff6b2c",
  coralDark: "#b93c00",
  yellow: "#ffe066",
  teal: "#12958b",
  tealBright: "#8df8ee",
  text: "#171717",
  textMuted: "#54483d",
  outline: "#171717",
  shadow: "#171717",
  focus: "#171717",
  success: "#12958b",
  danger: "#ff6b2c",
  white: "#fffaf1"
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40
} as const;

export const radii = {
  medium: 18,
  large: 26,
  pill: 999
} as const;

export const borderWidths = {
  thin: 2,
  thick: 4
} as const;

export const fontFamilies = {
  body: "SpaceGrotesk_400Regular",
  medium: "SpaceGrotesk_500Medium",
  bold: "SpaceGrotesk_700Bold"
} as const;

export const typography = {
  eyebrow: {
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    letterSpacing: 1.2,
    lineHeight: 16,
    textTransform: "uppercase"
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 24
  },
  bodyStrong: {
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    lineHeight: 24
  },
  label: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.4
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.4
  },
  hero: {
    fontFamily: fontFamilies.bold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.2
  },
  button: {
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.3
  },
  metric: {
    fontFamily: fontFamilies.bold,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -1
  }
} as const;

export const shadows = {
  card: {
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0
  },
  button: {
    elevation: 6,
    shadowColor: colors.shadow,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0
  },
  floating: {
    elevation: 5,
    shadowColor: colors.shadow,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0
  },
  pressed: {
    elevation: 0,
    shadowColor: colors.shadow,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0
  }
} as const;
