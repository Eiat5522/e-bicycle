import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { formatCurrency, formatDistanceKm, type RideHistoryItem } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { configuredRideHistoryService } from "@/lib/ride-history-service";
import { colors, spacing } from "@/theme/tokens";

import {
  formatRideDateTime,
  formatRideDurationLabel
} from "./ride-history-formatters";
import { RideReplayMap } from "./ride-replay-map";

export function RideHistoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const rideId = Array.isArray(id) ? id[0] : id;
  const [ride, setRide] = useState<RideHistoryItem | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadRide() {
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
          error instanceof Error ? error.message : "Unable to load ride details."
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
        title="Ride Details"
        description="Review route details, trip metrics, and replay the completed ride path.">
        <SurfaceCard tone="muted">
          <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
            Loading ride details
          </Text>
          <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
            Pulling the selected trip from Supabase.
          </Text>
        </SurfaceCard>
      </ScreenShell>
    );
  }

  if (errorMessage) {
    return (
      <ScreenShell
        title="Ride Details"
        description="The selected trip could not be loaded right now.">
        <SurfaceCard tone="accent">
          <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
            Ride details unavailable
          </Text>
          <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
            {errorMessage}
          </Text>
          <PrimaryButton label="Back to Profile" onPress={() => router.replace("/(tabs)/profile")} />
        </SurfaceCard>
      </ScreenShell>
    );
  }

  if (!ride) {
    return (
      <ScreenShell
        title="Ride Details"
        description="The selected trip could not be found in your ride history.">
        <SurfaceCard tone="accent">
          <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
            Trip unavailable
          </Text>
          <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
            Return to your profile and pick another completed ride.
          </Text>
          <PrimaryButton label="Back to Profile" onPress={() => router.replace("/(tabs)/profile")} />
        </SurfaceCard>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title="Ride Details"
      description="Review route details, trip metrics, and replay the completed ride path.">
      <SurfaceCard tone="accent">
        <Text selectable style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>
          {ride.routeLabel}
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          {ride.startLocation} to {ride.endLocation}
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          {ride.paymentLabel}
        </Text>
      </SurfaceCard>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <SurfaceCard>
            <Text selectable style={{ color: colors.textMuted, fontSize: 14 }}>
              Total cost
            </Text>
            <Text selectable style={{ color: colors.text, fontSize: 24, fontWeight: "800" }}>
              {formatCurrency(ride.totalCost)}
            </Text>
          </SurfaceCard>
        </View>
        <View style={{ flex: 1 }}>
          <SurfaceCard>
            <Text selectable style={{ color: colors.textMuted, fontSize: 14 }}>
              Distance
            </Text>
            <Text selectable style={{ color: colors.text, fontSize: 24, fontWeight: "800" }}>
              {formatDistanceKm(ride.distanceKm)}
            </Text>
          </SurfaceCard>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <SurfaceCard>
            <Text selectable style={{ color: colors.textMuted, fontSize: 14 }}>
              Duration
            </Text>
            <Text selectable style={{ color: colors.text, fontSize: 24, fontWeight: "800" }}>
              {formatRideDurationLabel(ride.durationSec)}
            </Text>
          </SurfaceCard>
        </View>
        <View style={{ flex: 1 }}>
          <SurfaceCard>
            <Text selectable style={{ color: colors.textMuted, fontSize: 14 }}>
              CO2 saved
            </Text>
            <Text selectable style={{ color: colors.text, fontSize: 24, fontWeight: "800" }}>
              {ride.co2SavedKg} kg
            </Text>
          </SurfaceCard>
        </View>
      </View>

      <SurfaceCard>
        <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
          Route details
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          Bike: {ride.bikeModel} ({ride.bikeId})
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          Started: {formatRideDateTime(ride.startedAt)}
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          Completed: {formatRideDateTime(ride.completedAt)}
        </Text>
      </SurfaceCard>

      <RideReplayMap ride={ride} />

      <SurfaceCard>
        <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
          Route milestones
        </Text>
        <View style={{ gap: spacing.sm }}>
          {ride.checkpoints?.map((checkpoint) => (
            <View key={checkpoint.id} style={{ gap: spacing.xs }}>
              <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                {checkpoint.label}
              </Text>
              <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
                {checkpoint.description}
              </Text>
            </View>
          )) ?? (
            <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
              No milestones recorded for this ride.
            </Text>
          )}
        </View>
      </SurfaceCard>
    </ScreenShell>
  );
}
