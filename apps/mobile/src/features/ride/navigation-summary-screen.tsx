import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";

import { formatDistanceKm, type Coordinates } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import {
  getWalkingRouteSummary,
  type WalkingRouteOption,
  type WalkingRouteSummary
} from "@/lib/mapbox-directions";
import { colors, spacing, typography } from "@/theme/tokens";

type RouteParams = {
  bikeId?: string | string[];
  bikeModel?: string | string[];
  destinationName?: string | string[];
  destinationLatitude?: string | string[];
  destinationLongitude?: string | string[];
  originName?: string | string[];
  originLatitude?: string | string[];
  originLongitude?: string | string[];
};

function readFirst(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseCoordinate(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatEta(durationSec: number) {
  const totalMinutes = Math.max(1, Math.round(durationSec / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (!hours) {
    return `${totalMinutes} min`;
  }

  if (!minutes) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
}

function RouteMetric({
  label,
  value
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        gap: spacing.xxs
      }}>
      <Text selectable style={{ ...typography.eyebrow, color: colors.textMuted }}>
        {label}
      </Text>
      <Text selectable style={{ ...typography.title, color: colors.text }}>
        {value}
      </Text>
    </View>
  );
}

function RouteCard({
  heading,
  route
}: {
  readonly heading: string;
  readonly route: WalkingRouteOption;
}) {
  return (
    <SurfaceCard>
      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xxs }}>
          <Text selectable style={{ ...typography.eyebrow, color: colors.coralDark }}>
            {heading}
          </Text>
          <Text selectable style={{ ...typography.title, color: colors.text }}>
            {route.label}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.md }}>
          <RouteMetric label="Distance" value={formatDistanceKm(route.distanceMeters / 1000)} />
          <RouteMetric label="ETA" value={formatEta(route.durationSec)} />
        </View>
      </View>
    </SurfaceCard>
  );
}

export function NavigationSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<RouteParams>();
  const [routeSummary, setRouteSummary] = useState<WalkingRouteSummary | null | undefined>(
    undefined
  );

  const bikeId = readFirst(params.bikeId);
  const bikeModel = readFirst(params.bikeModel) ?? "Selected bike";
  const destinationName = readFirst(params.destinationName) ?? "Bike destination";
  const originName = readFirst(params.originName) ?? "Current location";
  const origin = useMemo<Coordinates | null>(() => {
    const latitude = parseCoordinate(readFirst(params.originLatitude));
    const longitude = parseCoordinate(readFirst(params.originLongitude));

    return latitude === undefined || longitude === undefined ? null : { latitude, longitude };
  }, [params.originLatitude, params.originLongitude]);
  const destination = useMemo<Coordinates | null>(() => {
    const latitude = parseCoordinate(readFirst(params.destinationLatitude));
    const longitude = parseCoordinate(readFirst(params.destinationLongitude));

    return latitude === undefined || longitude === undefined ? null : { latitude, longitude };
  }, [params.destinationLatitude, params.destinationLongitude]);

  useEffect(() => {
    let isMounted = true;

    async function loadRouteSummary() {
      if (!origin || !destination) {
        if (isMounted) {
          setRouteSummary(null);
        }
        return;
      }

      try {
        const summary = await getWalkingRouteSummary({
          origin,
          destination
        });

        if (isMounted) {
          setRouteSummary(summary);
        }
      } catch {
        if (isMounted) {
          setRouteSummary(null);
        }
      }
    }

    void loadRouteSummary();

    return () => {
      isMounted = false;
    };
  }, [destination, origin]);

  if (!bikeId || !origin || !destination) {
    return (
      <ScreenShell
        title="Navigation unavailable"
        description="The selected bike or route coordinates are missing.">
        <SurfaceCard tone="accent">
          <Text selectable style={{ ...typography.title, color: colors.text }}>
            Route preview unavailable
          </Text>
          <Text selectable style={{ ...typography.body, color: colors.textMuted }}>
            Return to the map and choose a bike again.
          </Text>
          <PrimaryButton label="Back to Map" onPress={() => router.replace("/(tabs)")} />
        </SurfaceCard>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title={`Walk to ${bikeModel}`}
      description="Preview the walking route before you leave the map flow. Unlock stays separate for now.">
      <SurfaceCard>
        <View style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.xxs }}>
            <Text selectable style={{ ...typography.eyebrow, color: colors.textMuted }}>
              Start
            </Text>
            <Text selectable style={{ ...typography.title, color: colors.text }}>
              {originName}
            </Text>
          </View>
          <View style={{ gap: spacing.xxs }}>
            <Text selectable style={{ ...typography.eyebrow, color: colors.textMuted }}>
              Destination
            </Text>
            <Text selectable style={{ ...typography.title, color: colors.text }}>
              {destinationName}
            </Text>
            <Text selectable style={{ ...typography.body, color: colors.textMuted }}>
              Bike {bikeId}
            </Text>
          </View>
        </View>
      </SurfaceCard>

      {routeSummary === undefined ? (
        <SurfaceCard tone="muted">
          <Text selectable style={{ ...typography.title, color: colors.text }}>
            Loading walking route
          </Text>
          <Text selectable style={{ ...typography.body, color: colors.textMuted }}>
            Asking Mapbox for the shortest walking preview.
          </Text>
        </SurfaceCard>
      ) : null}

      {routeSummary ? (
        <>
          <RouteCard heading="Primary route" route={routeSummary.primaryRoute} />
          {routeSummary.alternateRoutes[0] ? (
            <RouteCard heading="Alternate route" route={routeSummary.alternateRoutes[0]} />
          ) : null}
        </>
      ) : null}

      {routeSummary === null ? (
        <SurfaceCard tone="accent">
          <Text selectable style={{ ...typography.title, color: colors.text }}>
            Route preview unavailable
          </Text>
          <Text selectable style={{ ...typography.body, color: colors.textMuted }}>
            We could not load a Mapbox walking route right now. You can return to the map and try again.
          </Text>
        </SurfaceCard>
      ) : null}

      <PrimaryButton label="Back to Map" onPress={() => router.replace("/(tabs)")} />
    </ScreenShell>
  );
}
