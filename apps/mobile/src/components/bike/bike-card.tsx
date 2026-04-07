import { View } from "react-native";

import type { Bike } from "@glide/shared";
import { formatDistanceKm } from "@glide/shared";

import { PricingCard } from "@/components/bike/pricing-card";
import { PrimaryButton } from "@/components/primary-button";
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
          <AppText variant="caption">Range {formatDistanceKm(bike.estimatedRangeKm)}</AppText>
        </View>
        <Chip
          label={bike.status === "available" ? "Ready" : bike.status === "reserved" ? "Reserved" : "In use"}
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
