export const colors = {
  background: "#0A7B53",
  surface: "#FFFFFF",
  surfaceMuted: "#F5F3EE",
  surfaceStrong: "#E6E1D8",
  primary: "#0DB57A",
  primaryPressed: "#099865",
  coral: "#FE7E4F",
  coralDark: "#A03A0F",
  yellow: "#FDBA10",
  teal: "#006668",
  tealBright: "#5DFBFE",
  text: "#1B1E1D",
  textMuted: "#5F635F",
  outline: "rgba(27, 30, 29, 0.12)",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
  mapWater: "#BFD7EA",
  mapLand: "#EDE8DD",
  markerAvailable: "#0A7B53",
  markerReserved: "#FDBA10",
  markerMaintenance: "#FE7E4F",
  markerSelected: "#111827",
  shadow: "#000000"
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  giant: 48
} as const;

export const radii = {
  sm: 12,
  medium: 20,
  large: 28,
  xl: 36,
  pill: 999
} as const;

export const shadows = {
  soft: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 4
  },
  floating: {
    shadowColor: colors.shadow,
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 8
  }
} as const;

export const sizes = {
  tabBarHeight: 72,
  mapActionButton: 48,
  marker: 40,
  markerSelected: 52,
  bikeCardMinHeight: 182,
  sheetPeek: 250
} as const;
