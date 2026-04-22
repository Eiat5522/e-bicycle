import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { mockRideSummary } from "@glide/api";
import { formatCurrency, formatDistanceKm, type RideHistoryItem } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { configuredRideHistoryService } from "@/lib/ride-history-service";
import { hasSupabaseConfig } from "@/lib/supabase";
import { colors, spacing } from "@/theme/tokens";

export function RideSummaryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const rideId = Array.isArray(id) ? id[0] : id;
  const [ride, setRide] = useState<RideHistoryItem | undefined>();
  const [isLoading, setIsLoading] = useState(hasSupabaseConfig);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRide() {
      if (!hasSupabaseConfig) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      if (!rideId) {
        if (isMounted) {
          setRide(undefined);
          setErrorMessage(null);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextRide = await configuredRideHistoryService.getRideHistoryById(rideId);

        if (!isMounted) {
          return;
        }

        setRide(nextRide);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setRide(undefined);
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load the completed ride."
        );
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadRide();

    return () => {
      isMounted = false;
    };
  }, [rideId]);

  if (isLoading) {
    return (
      <ScreenShell
        title="Great ride, Alex!"
        description="The summary screen closes the ride loop with cost, distance, and sustainability stats inspired by the Stitch reference.">
        <SurfaceCard tone="muted">
          <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
            Loading ride summary
          </Text>
          <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
            Pulling the completed trip from Supabase.
          </Text>
        </SurfaceCard>
      </ScreenShell>
    );
  }

  if (hasSupabaseConfig && errorMessage) {
    return (
      <ScreenShell
        title="Ride Summary"
        description="The ride summary could not be loaded right now.">
        <SurfaceCard tone="accent">
          <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
            Ride summary unavailable
          </Text>
          <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
            {errorMessage}
          </Text>
          <PrimaryButton label="Back to Map" onPress={() => router.replace("/(tabs)")} />
        </SurfaceCard>
      </ScreenShell>
    );
  }

  if (hasSupabaseConfig && !ride) {
    return (
      <ScreenShell
        title="Ride Summary"
        description="The completed trip could not be found.">
        <SurfaceCard tone="accent">
          <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
            Ride unavailable
          </Text>
          <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
            Return to the map and start another demo ride.
          </Text>
          <PrimaryButton label="Back to Map" onPress={() => router.replace("/(tabs)")} />
        </SurfaceCard>
      </ScreenShell>
    );
  }

  const summary = hasSupabaseConfig && ride
    ? {
        totalCost: ride.totalCost,
        distanceKm: ride.distanceKm,
        co2SavedKg: ride.co2SavedKg,
        routeLabel: ride.routeLabel
      }
    : mockRideSummary;

  return (
    <ScreenShell
      title="Great ride, Alex!"
      description="The summary screen closes the ride loop with cost, distance, and sustainability stats inspired by the Stitch reference.">
      <SurfaceCard tone="accent">
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          Total cost
        </Text>
        <Text selectable style={{ color: colors.text, fontSize: 32, fontWeight: "800" }}>
          {formatCurrency(summary.totalCost)}
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          Distance: {formatDistanceKm(summary.distanceKm)}
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          CO2 saved: {summary.co2SavedKg} kg
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          Route: {summary.routeLabel}
        </Text>
      </SurfaceCard>

      <View style={{ gap: spacing.sm }}>
        <PrimaryButton label="Share My Trip" variant="secondary" disabled />
        <PrimaryButton label="Back to Map" onPress={() => router.replace("/(tabs)")} />
      </View>
    </ScreenShell>
  );
}
