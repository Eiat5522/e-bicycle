import { useEffect, useState } from "react";
import { Image, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import type { Bike } from "@glide/shared";
import { formatDistanceKm } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { configuredBikeService } from "@/lib/bike-service";
import { colors, spacing } from "@/theme/tokens";

export function BikeDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const [selectedBike, setSelectedBike] = useState<Bike>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadBike() {
      if (!params.id) {
        if (isMounted) {
          setErrorMessage("The selected bike could not be resolved.");
          setSelectedBike(undefined);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        const bike = await configuredBikeService.getById(params.id);

        if (!isMounted) {
          return;
        }

        if (!bike) {
          setErrorMessage("The selected bike could not be resolved.");
          setSelectedBike(undefined);
          setIsLoading(false);
          return;
        }

        setSelectedBike(bike);
        setErrorMessage(undefined);
        setIsLoading(false);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "We could not load that bicycle right now."
        );
        setSelectedBike(undefined);
        setIsLoading(false);
      }
    }

    void loadBike();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  if (isLoading) {
    return (
      <ScreenShell title="Loading bike" description="Fetching the latest bicycle record.">
        <SurfaceCard>
          <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
            Pulling the current bicycle details and image from the live fleet record.
          </Text>
        </SurfaceCard>
      </ScreenShell>
    );
  }

  if (!selectedBike) {
    return (
      <ScreenShell title="Bike not found" description="The selected bike could not be resolved.">
        <SurfaceCard>
          <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
            {errorMessage ?? "Check the route param or return to the map to pick another ride."}
          </Text>
        </SurfaceCard>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      title={selectedBike.model}
      description={`${selectedBike.id} is ready to glide with ${formatDistanceKm(selectedBike.estimatedRangeKm)} of estimated range.`}>
      <SurfaceCard tone="accent">
        {selectedBike.imageUrl ? (
          <Image
            accessibilityLabel={`${selectedBike.model} photo`}
            source={{ uri: selectedBike.imageUrl }}
            style={{
              borderRadius: 20,
              height: 220,
              marginBottom: spacing.md,
              width: "100%"
            }}
          />
        ) : null}
        <Text selectable style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
          {selectedBike.pricingLabel}
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          Status: {selectedBike.status} · Location: {selectedBike.location}
        </Text>
      </SurfaceCard>

      <SurfaceCard tone="accent">
        <Text selectable style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}>
          Live fleet record
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          This bike detail card is loaded from the same bicycle record maintained in the admin app.
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
          Vehicle details
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          Top speed: {selectedBike.topSpeedKmh} km/h
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          Ride class: {selectedBike.rideClass ?? "Unknown"}
        </Text>
      </SurfaceCard>

      <View style={{ gap: spacing.sm }}>
        <PrimaryButton
          label="Unlock and Ride"
          onPress={() => router.push(`/unlock/${selectedBike.id}`)}
        />
        <PrimaryButton
          label="Need Help?"
          onPress={() => router.push("/help")}
          variant="secondary"
        />
      </View>
    </ScreenShell>
  );
}
