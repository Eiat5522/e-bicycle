# Glide Expo UI Starter Kit for `mvp/development`

This starter kit is tailored to your current Expo Router monorepo layout under `apps/mobile`.

## Why this shape fits your branch

- Root is a pnpm monorepo with `apps/*` and `packages/*`
- Mobile app already uses Expo Router via `expo-router/entry`
- `react-native-maps`, `expo-haptics`, and `react-native-gesture-handler` are already installed
- Current app already has `@/theme/tokens`, `PrimaryButton`, and `SurfaceCard`
- Current map route renders `MapScreen` from `src/features/map/map-screen`

---

## Recommended file structure

```text
apps/mobile/
├─ app/
│  ├─ _layout.tsx
│  ├─ (tabs)/
│  │  ├─ _layout.tsx
│  │  └─ index.tsx
│  └─ bike/[id].tsx
├─ src/
│  ├─ components/
│  │  ├─ bike/
│  │  │  ├─ bike-card.tsx
│  │  │  ├─ bike-marker.tsx
│  │  │  └─ pricing-card.tsx
│  │  ├─ layout/
│  │  │  ├─ screen.tsx
│  │  │  └─ stack.tsx
│  │  ├─ ui/
│  │  │  ├─ app-text.tsx
│  │  │  ├─ bottom-sheet.tsx
│  │  │  ├─ chip.tsx
│  │  │  └─ icon-button.tsx
│  │  ├─ primary-button.tsx
│  │  └─ surface-card.tsx
│  ├─ features/
│  │  └─ map/
│  │     ├─ map-screen.tsx
│  │     ├─ map-canvas.native.tsx
│  │     ├─ map-canvas.tsx
│  │     ├─ marker-colors.ts
│  │     └─ bike-distance.ts
│  ├─ theme/
│  │  ├─ tokens.ts
│  │  └─ typography.ts
│  └─ lib/
│     └─ mock-bikes.ts
```

---

## 1) Upgrade tokens without breaking your branch

### `apps/mobile/src/theme/tokens.ts`

Replace with:

```ts
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
```

---

## 2) Add typography helpers

### `apps/mobile/src/theme/typography.ts`

```ts
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
```

---

## 3) Add reusable text primitive

### `apps/mobile/src/components/ui/app-text.tsx`

```tsx
import type { ReactNode } from "react";
import { Text, type TextProps, type TextStyle } from "react-native";

import { colors } from "@/theme/tokens";
import { type TypeKey, type } from "@/theme/typography";

interface AppTextProps extends TextProps {
  readonly children: ReactNode;
  readonly variant?: TypeKey;
  readonly color?: string;
  readonly align?: TextStyle["textAlign"];
}

export function AppText({
  children,
  variant = "body",
  color = colors.text,
  align,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      selectable
      style={[type[variant], { color, textAlign: align }, style]}
      {...rest}>
      {children}
    </Text>
  );
}
```

---

## 4) Add small layout primitives

### `apps/mobile/src/components/layout/screen.tsx`

```tsx
import type { ReactNode } from "react";
import { SafeAreaView, View, type ViewStyle } from "react-native";

import { colors, spacing } from "@/theme/tokens";

interface ScreenProps {
  readonly children: ReactNode;
  readonly padded?: boolean;
  readonly style?: ViewStyle;
}

export function Screen({ children, padded = false, style }: ScreenProps) {
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }, style]}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: padded ? spacing.md : 0
        }}>
        {children}
      </View>
    </SafeAreaView>
  );
}
```

### `apps/mobile/src/components/layout/stack.tsx`

```tsx
import type { ReactNode } from "react";
import { View } from "react-native";

interface StackProps {
  readonly children: ReactNode;
  readonly gap?: number;
}

export function Stack({ children, gap = 12 }: StackProps) {
  return <View style={{ gap }}>{children}</View>;
}
```

---

## 5) Add icon button

### `apps/mobile/src/components/ui/icon-button.tsx`

```tsx
import { MaterialIcons } from "@expo/vector-icons";
import { Pressable } from "react-native";

import { colors, radii, sizes, shadows } from "@/theme/tokens";

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
      })}>
      <MaterialIcons name={icon} size={22} color={colors.text} />
    </Pressable>
  );
}
```

---

## 6) Add chip primitive

### `apps/mobile/src/components/ui/chip.tsx`

```tsx
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
```

---

## 7) Add bottom sheet component

This is a lightweight in-branch implementation that avoids extra dependencies.

### `apps/mobile/src/components/ui/bottom-sheet.tsx`

```tsx
import type { ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { colors, radii, shadows, spacing } from "@/theme/tokens";

interface BottomSheetProps {
  readonly visible: boolean;
  readonly title?: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

export function BottomSheet({ visible, title, onClose, children }: BottomSheetProps) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.28)"
        }}>
        <Pressable
          onPress={() => undefined}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: spacing.xxl,
            gap: spacing.md,
            ...shadows.floating
          }}>
          <View
            style={{
              alignSelf: "center",
              width: 52,
              height: 5,
              borderRadius: radii.pill,
              backgroundColor: colors.surfaceStrong,
              marginBottom: spacing.xs
            }}
          />
          {title ? <AppText variant="h3">{title}</AppText> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
```

---

## 8) Upgrade existing button to match starter kit

### `apps/mobile/src/components/primary-button.tsx`

```tsx
import { Pressable, Text, type GestureResponderEvent } from "react-native";

import { colors, radii, spacing, shadows } from "@/theme/tokens";

interface PrimaryButtonProps {
  readonly label: string;
  readonly onPress?: (event: GestureResponderEvent) => void;
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
```

---

## 9) Upgrade surface card for the new visual language

### `apps/mobile/src/components/surface-card.tsx`

```tsx
import type { ReactNode } from "react";
import { View } from "react-native";

import { colors, radii, spacing, shadows } from "@/theme/tokens";

interface SurfaceCardProps {
  readonly children: ReactNode;
  readonly tone?: "default" | "muted" | "accent" | "success";
}

export function SurfaceCard({ children, tone = "default" }: SurfaceCardProps) {
  const backgroundColor =
    tone === "accent"
      ? colors.yellow
      : tone === "muted"
        ? colors.surfaceMuted
        : tone === "success"
          ? "#E9F8EF"
          : colors.surface;

  return (
    <View
      style={{
        backgroundColor,
        borderRadius: radii.large,
        gap: spacing.sm,
        padding: spacing.lg,
        ...shadows.soft
      }}>
      {children}
    </View>
  );
}
```

---

## 10) Add tailored bike marker

### `apps/mobile/src/components/bike/bike-marker.tsx`

```tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

import { colors, radii, sizes, shadows } from "@/theme/tokens";

interface BikeMarkerProps {
  readonly selected?: boolean;
  readonly maintenance?: boolean;
  readonly reserved?: boolean;
  readonly onPress: () => void;
}

export function BikeMarker({
  selected = false,
  maintenance = false,
  reserved = false,
  onPress
}: BikeMarkerProps) {
  const backgroundColor = selected
    ? colors.markerSelected
    : reserved
      ? colors.markerReserved
      : maintenance
        ? colors.markerMaintenance
        : colors.markerAvailable;

  const size = selected ? sizes.markerSelected : sizes.marker;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: radii.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor,
        borderWidth: 2,
        borderColor: colors.surface,
        ...shadows.soft
      }}>
      <View
        style={{
          width: selected ? 20 : 18,
          height: selected ? 20 : 18,
          alignItems: "center",
          justifyContent: "center"
        }}>
        <MaterialCommunityIcons name="bike" size={selected ? 18 : 16} color={colors.surface} />
      </View>
    </Pressable>
  );
}
```

---

## 11) Add tailored pricing card

### `apps/mobile/src/components/bike/pricing-card.tsx`

```tsx
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
```

---

## 12) Add tailored bike card

### `apps/mobile/src/components/bike/bike-card.tsx`

```tsx
import { View } from "react-native";

import type { Bike } from "@glide/shared";
import { formatDistanceKm } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { PricingCard } from "@/components/bike/pricing-card";
import { SurfaceCard } from "@/components/surface-card";
import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { colors, spacing } from "@/theme/tokens";

interface BikeCardProps {
  readonly bike: Bike;
  readonly distanceLabel?: string;
  readonly selected?: boolean;
  readonly onRentNow: () => void;
  readonly onHelp: () => void;
  readonly onRing: () => void;
  readonly onDamage: () => void;
}

export function BikeCard({
  bike,
  distanceLabel,
  selected = false,
  onRentNow,
  onHelp,
  onRing,
  onDamage
}: BikeCardProps) {
  return (
    <SurfaceCard tone={selected ? "accent" : "default"}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <AppText variant="h3">{bike.model}</AppText>
          <AppText variant="body">
            {bike.location} · {distanceLabel ?? "Distance unavailable"}
          </AppText>
          <AppText variant="caption">
            Range {formatDistanceKm(bike.estimatedRangeKm)} · {bike.pricingLabel}
          </AppText>
        </View>
        <Chip
          label={bike.status === "available" ? "Ready" : bike.status === "reserved" ? "Reserved" : "Maintenance"}
          active={bike.status === "available"}
        />
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <PricingCard title="Unlock" price="£1" subtitle="Start your ride" />
        <PricingCard title="Pay as you go" price="£0.33/min" subtitle="Ideal for quick trips" featured />
        <PricingCard title="Pass" price="£3.99" subtitle="35 mins / 24h" />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <Chip label="Ring" onPress={onRing} />
        <Chip label="Bike damage" onPress={onDamage} />
        <Chip label="Help" onPress={onHelp} />
      </View>

      <PrimaryButton label="Rent now" onPress={onRentNow} />
      <AppText variant="caption" color={colors.textMuted}>
        Bike #{bike.id}
      </AppText>
    </SurfaceCard>
  );
}
```

---

## 13) Replace web fallback map with a native map implementation

### `apps/mobile/src/features/map/map-canvas.native.tsx`

```tsx
import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";

import type { Bike, Coordinates } from "@glide/shared";

import { BikeMarker } from "@/components/bike/bike-marker";
import { IconButton } from "@/components/ui/icon-button";
import { colors, radii, shadows, spacing } from "@/theme/tokens";

interface MapCanvasProps {
  readonly bikes: readonly Bike[];
  readonly bikeDistanceLabels?: Readonly<Record<string, string>>;
  readonly onRecenter: () => void;
  readonly selectedBikeId: string | undefined;
  readonly userCoordinates: Coordinates | undefined;
  readonly onSelectBike: (bikeId: string) => void;
}

const defaultRegion: Region = {
  latitude: 51.5072,
  longitude: -0.1276,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018
};

export function MapCanvas({
  bikes,
  onRecenter,
  selectedBikeId,
  userCoordinates,
  onSelectBike
}: MapCanvasProps) {
  const mapRef = useRef<MapView | null>(null);

  const initialRegion = useMemo<Region>(() => {
    if (!userCoordinates) {
      return defaultRegion;
    }

    return {
      latitude: userCoordinates.latitude,
      longitude: userCoordinates.longitude,
      latitudeDelta: 0.018,
      longitudeDelta: 0.018
    };
  }, [userCoordinates]);

  useEffect(() => {
    if (!mapRef.current || !userCoordinates) {
      return;
    }

    mapRef.current.animateToRegion(initialRegion, 350);
  }, [initialRegion, userCoordinates]);

  return (
    <View
      style={{
        height: 420,
        borderRadius: radii.xl,
        overflow: "hidden",
        backgroundColor: colors.surface,
        ...shadows.floating
      }}>
      <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={initialRegion} showsUserLocation>
        {bikes.map((bike) => {
          const selected = bike.id === selectedBikeId;
          return (
            <Marker
              key={bike.id}
              coordinate={{
                latitude: bike.coordinates.latitude,
                longitude: bike.coordinates.longitude
              }}
              onPress={() => onSelectBike(bike.id)}
              tracksViewChanges={false}>
              <BikeMarker
                selected={selected}
                reserved={bike.status === "reserved"}
                maintenance={bike.status === "maintenance"}
                onPress={() => onSelectBike(bike.id)}
              />
            </Marker>
          );
        })}
      </MapView>

      <View
        style={{
          position: "absolute",
          top: spacing.md,
          right: spacing.md
        }}>
        <IconButton icon="my-location" onPress={onRecenter} accessibilityLabel="Recenter map" />
      </View>
    </View>
  );
}
```

---

## 14) Keep a web fallback so Expo web still works

### `apps/mobile/src/features/map/map-canvas.tsx`

```tsx
import { Pressable, View } from "react-native";

import type { Bike, Coordinates } from "@glide/shared";

import { BikeMarker } from "@/components/bike/bike-marker";
import { IconButton } from "@/components/ui/icon-button";
import { SurfaceCard } from "@/components/surface-card";
import { AppText } from "@/components/ui/app-text";
import { colors, spacing } from "@/theme/tokens";

interface MapCanvasProps {
  readonly bikes: readonly Bike[];
  readonly bikeDistanceLabels?: Readonly<Record<string, string>>;
  readonly onRecenter: () => void;
  readonly selectedBikeId: string | undefined;
  readonly userCoordinates: Coordinates | undefined;
  readonly onSelectBike: (bikeId: string) => void;
}

export function MapCanvas({
  bikes,
  bikeDistanceLabels,
  onRecenter,
  selectedBikeId,
  userCoordinates,
  onSelectBike
}: MapCanvasProps) {
  return (
    <SurfaceCard>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <AppText variant="h3">Nearby bikes</AppText>
        <IconButton icon="my-location" onPress={onRecenter} accessibilityLabel="Recenter map" />
      </View>

      <AppText variant="caption">
        Web fallback · Current location:
        {userCoordinates
          ? `${userCoordinates.latitude.toFixed(4)}, ${userCoordinates.longitude.toFixed(4)}`
          : "unknown"}
      </AppText>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
        {bikes.map((bike) => {
          const selected = bike.id === selectedBikeId;
          return (
            <Pressable
              key={bike.id}
              onPress={() => onSelectBike(bike.id)}
              style={{
                minWidth: "47%",
                padding: spacing.sm,
                borderRadius: 16,
                backgroundColor: selected ? colors.surfaceMuted : colors.surface,
                borderWidth: 1,
                borderColor: colors.outline,
                gap: spacing.xs
              }}>
              <BikeMarker
                selected={selected}
                reserved={bike.status === "reserved"}
                maintenance={bike.status === "maintenance"}
                onPress={() => onSelectBike(bike.id)}
              />
              <AppText variant="label">{bike.model}</AppText>
              <AppText variant="caption">{bike.location}</AppText>
              <AppText variant="caption">{bikeDistanceLabels?.[bike.id] ?? "Distance unavailable"}</AppText>
            </Pressable>
          );
        })}
      </View>
    </SurfaceCard>
  );
}
```

---

## 15) Tailor the current map screen to use bottom sheet + bike card

### `apps/mobile/src/features/map/map-screen.tsx`

Replace the current file with this version:

```tsx
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";

import type { Coordinates, NearbyBikesResult } from "@glide/shared";
import { formatDistanceKm } from "@glide/shared";

import { BikeCard } from "@/components/bike/bike-card";
import { Screen } from "@/components/layout/screen";
import { Stack } from "@/components/layout/stack";
import { PrimaryButton } from "@/components/primary-button";
import { SurfaceCard } from "@/components/surface-card";
import { AppText } from "@/components/ui/app-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { configuredBikeService } from "@/lib/bike-service";
import { colors, spacing } from "@/theme/tokens";

import { calculateDistanceKm, sortBikesByDistance } from "./bike-distance";
import { MapCanvas } from "./map-canvas";

export const DEFAULT_NEARBY_RADIUS_METERS = 1500;
export const MAP_POLL_INTERVAL_MS = 15000;

type LoadState = "loading" | "ready" | "permission_denied" | "error";

export function MapScreen() {
  const isFocused = useIsFocused();
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [refreshError, setRefreshError] = useState<string>();
  const [userCoordinates, setUserCoordinates] = useState<Coordinates>();
  const [nearbyResult, setNearbyResult] = useState<NearbyBikesResult>();
  const [selectedBikeId, setSelectedBikeId] = useState<string>();
  const [sheetVisible, setSheetVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const loadNearbyBikes = useCallback(
    async (coordinates: Coordinates) => {
      const result = await configuredBikeService.listNearby({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        radiusMeters: DEFAULT_NEARBY_RADIUS_METERS,
        limit: 50
      });

      setNearbyResult(result);
      setSelectedBikeId((currentId) => currentId ?? result.bikes[0]?.id);
      setLoadState("ready");
      setErrorMessage(undefined);
      setRefreshError(undefined);
    },
    []
  );

  const requestLocationAndLoad = useCallback(async () => {
    setLoadState("loading");

    const permission = await Location.requestForegroundPermissionsAsync();

    if (!permission.granted) {
      setLoadState("permission_denied");
      setErrorMessage("Location permission is required to show bikes near you.");
      setRefreshError(undefined);
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      const coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      setUserCoordinates(coordinates);
      await loadNearbyBikes(coordinates);
    } catch (error) {
      setLoadState("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "We could not determine your current location."
      );
      setRefreshError(undefined);
    }
  }, [loadNearbyBikes]);

  useEffect(() => {
    void requestLocationAndLoad();
  }, [requestLocationAndLoad]);

  useEffect(() => {
    if (!isFocused || !userCoordinates) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      void loadNearbyBikes(userCoordinates).catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : "Failed to refresh nearby bikes.";

        setErrorMessage(message);

        if (!nearbyResult) {
          setLoadState("error");
          return;
        }

        setRefreshError("Unable to refresh right now. Showing the latest available bikes.");
      });
    }, MAP_POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isFocused, loadNearbyBikes, nearbyResult, userCoordinates]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && userCoordinates) {
        void loadNearbyBikes(userCoordinates).catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : "Failed to refresh nearby bikes.";

          setErrorMessage(message);

          if (!nearbyResult) {
            setLoadState("error");
            return;
          }

          setRefreshError("Unable to refresh right now. Showing the latest available bikes.");
        });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadNearbyBikes, nearbyResult, userCoordinates]);

  const sortedBikes = useMemo(
    () => sortBikesByDistance(nearbyResult?.bikes ?? [], userCoordinates),
    [nearbyResult?.bikes, userCoordinates]
  );

  const selectedBike = useMemo(
    () => sortedBikes.find((bike) => bike.id === selectedBikeId) ?? sortedBikes[0],
    [selectedBikeId, sortedBikes]
  );

  const bikeDistanceLabels = useMemo(() => {
    if (!userCoordinates) {
      return {};
    }

    return Object.fromEntries(
      sortedBikes.map((bike) => [
        bike.id,
        `${formatDistanceKm(calculateDistanceKm(userCoordinates, bike.coordinates))} away`
      ])
    );
  }, [sortedBikes, userCoordinates]);

  const handleSelectBike = useCallback((bikeId: string) => {
    setSelectedBikeId(bikeId);
    setSheetVisible(true);
    void Haptics.selectionAsync();
  }, []);

  const handleRecenterToCurrentLocation = useCallback(async () => {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      const coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      setUserCoordinates(coordinates);
      await loadNearbyBikes(coordinates);
    } catch (error) {
      setRefreshError(
        error instanceof Error ? error.message : "Unable to recenter to your current location."
      );
    }
  }, [loadNearbyBikes]);

  return (
    <Screen>
      <View style={{ flex: 1 }}>
        {loadState === "loading" ? (
          <View style={{ padding: spacing.md }}>
            <SurfaceCard tone="muted">
              <AppText variant="h3">Finding your location</AppText>
              <AppText variant="body">
                Glide is requesting location access and loading bikes within 1.5 km.
              </AppText>
            </SurfaceCard>
          </View>
        ) : null}

        {loadState === "permission_denied" ? (
          <View style={{ padding: spacing.md }}>
            <SurfaceCard tone="accent">
              <Stack gap={spacing.sm}>
                <AppText variant="h3">Location access is off</AppText>
                <AppText variant="body">{errorMessage}</AppText>
                <PrimaryButton label="Try Again" onPress={() => void requestLocationAndLoad()} />
              </Stack>
            </SurfaceCard>
          </View>
        ) : null}

        {loadState === "error" ? (
          <View style={{ padding: spacing.md }}>
            <SurfaceCard tone="accent">
              <Stack gap={spacing.sm}>
                <AppText variant="h3">We could not load nearby bikes</AppText>
                <AppText variant="body">{errorMessage}</AppText>
                <PrimaryButton label="Retry" onPress={() => void requestLocationAndLoad()} />
              </Stack>
            </SurfaceCard>
          </View>
        ) : null}

        {loadState === "ready" ? (
          <>
            <MapCanvas
              bikes={sortedBikes}
              bikeDistanceLabels={bikeDistanceLabels}
              onRecenter={() => void handleRecenterToCurrentLocation()}
              selectedBikeId={selectedBikeId}
              userCoordinates={userCoordinates}
              onSelectBike={handleSelectBike}
            />

            <BottomSheet
              visible={sheetVisible && Boolean(selectedBike)}
              title={selectedBike ? `${selectedBike.model}` : "Bike details"}
              onClose={() => setSheetVisible(false)}>
              {refreshError ? (
                <SurfaceCard tone="muted">
                  <AppText variant="label">Refresh paused</AppText>
                  <AppText variant="body">{refreshError}</AppText>
                </SurfaceCard>
              ) : null}

              {selectedBike ? (
                <BikeCard
                  bike={selectedBike}
                  distanceLabel={bikeDistanceLabels[selectedBike.id]}
                  selected
                  onRentNow={() => router.push(`/unlock/${selectedBike.id}`)}
                  onHelp={() => router.push("/help")}
                  onRing={() => void Haptics.selectionAsync()}
                  onDamage={() => router.push(`/bike/${selectedBike.id}`)}
                />
              ) : null}
            </BottomSheet>
          </>
        ) : null}
      </View>
    </Screen>
  );
}
```

---

## 16) Optional mock data for local UI development

If your API is not ready during UI work, add this helper.

### `apps/mobile/src/lib/mock-bikes.ts`

```ts
import type { NearbyBikesResult } from "@glide/shared";

export const mockNearbyBikes: NearbyBikesResult = {
  serverTime: new Date().toISOString(),
  bikes: [
    {
      id: "19308",
      model: "Forest Bike",
      location: "Trafalgar Square",
      pricingLabel: "£0.33 / min",
      estimatedRangeKm: 64,
      status: "available",
      coordinates: { latitude: 51.5081, longitude: -0.1281 }
    },
    {
      id: "19309",
      model: "Forest Bike",
      location: "Covent Garden",
      pricingLabel: "£0.33 / min",
      estimatedRangeKm: 41,
      status: "reserved",
      coordinates: { latitude: 51.5117, longitude: -0.124 }
    },
    {
      id: "19310",
      model: "Forest Bike",
      location: "Charing Cross",
      pricingLabel: "£0.33 / min",
      estimatedRangeKm: 22,
      status: "maintenance",
      coordinates: { latitude: 51.5075, longitude: -0.1246 }
    }
  ]
};
```

---

## 17) Notes for your current branch

### Already aligned with your branch

- Keeps Expo Router entry unchanged
- Keeps `app/(tabs)/index.tsx` pointing to `MapScreen`
- Keeps existing `configuredBikeService.listNearby(...)` usage
- Keeps current `@/` alias style
- Uses packages you already have installed in `apps/mobile/package.json`

### What this starter kit changes

- Upgrades the current token system into a fuller design system
- Replaces list-heavy map screen with a map-first UI
- Introduces a bottom-sheet driven selected-bike experience
- Adds reusable bike-specific primitives so future screens stay consistent

---

## 18) Recommended next step after pasting this in

Run from repo root:

```bash
pnpm --filter @glide/mobile typecheck
pnpm --filter @glide/mobile test
pnpm --filter @glide/mobile dev
```

---

## 19) Best follow-up enhancements

1. Add animated bottom-sheet drag with Reanimated
2. Add clustering when bike count grows
3. Add scan-to-unlock CTA block
4. Add live ride state banner on top of the map
5. Add pass selection screen linked from `PricingCard`
