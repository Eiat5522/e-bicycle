import { View } from "react-native";

import type { Bike } from "@glide/shared";
import { formatDistanceKm } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { PricingCard } from "@/components/bike/pricing-card";
import { SurfaceCard } from "@/components/surface-card";
import { AppText } from "@/components/ui/app-text";
import { Chip } from "@/components/ui/chip";
import { colors, sizes, spacing } from "@/theme/tokens";

export interface BikePricingOption {
  readonly key: string;
  readonly title: string;
  readonly priceInMinorUnits?: number;
  readonly priceNumber?: number;
  readonly currency?: string;
  readonly unit?: string;
  readonly subtitle: string;
  readonly featured?: boolean;
  readonly displayPrice?: string;
}

function getBikeStatusChipLabel(status: Bike["status"]) {
  if (status === "available") {
    return "Ready";
  }

  if (status === "reserved") {
    return "Reserved";
  }

  if (status === "in_use") {
    return "In use";
  }

  return "Maintenance";
}

function getCurrencyForPricingLabel(pricingLabel: string) {
  if (pricingLabel.includes("£")) {
    return "GBP";
  }

  if (pricingLabel.includes("€")) {
    return "EUR";
  }

  if (pricingLabel.includes("$")) {
    return "USD";
  }

  return undefined;
}

function getPricingOptionsFromBike(bike: Bike): readonly BikePricingOption[] {
  const [pricePart, unitPart] = bike.pricingLabel.split("/").map((part) => part.trim());
  const numericPrice = Number(pricePart?.replace(/[^\d.]/g, ""));
  const currency = getCurrencyForPricingLabel(bike.pricingLabel);

  if (Number.isFinite(numericPrice) && currency) {
    return [
      {
        key: "bike-rate",
        title: "Pay as you go",
        priceNumber: numericPrice,
        currency,
        ...(unitPart ? { unit: unitPart } : {}),
        subtitle: "Current bike rate",
        featured: true
      }
    ];
  }

  return [
    {
      key: "bike-rate",
      title: "Pay as you go",
      displayPrice: bike.pricingLabel,
      subtitle: "Current bike rate",
      featured: true
    }
  ];
}

function formatPricingOptionPrice(
  pricingOption: BikePricingOption,
  locale: string,
  fallbackCurrency: string
) {
  const amount =
    pricingOption.priceNumber ??
    (pricingOption.priceInMinorUnits === undefined
      ? undefined
      : pricingOption.priceInMinorUnits / 100);

  if (amount === undefined) {
    return pricingOption.displayPrice ?? "";
  }

  const formattedAmount = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: pricingOption.currency ?? fallbackCurrency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(amount);

  return pricingOption.unit ? `${formattedAmount}/${pricingOption.unit}` : formattedAmount;
}

interface BikeCardProps {
  readonly bike: Bike;
  readonly distanceLabel?: string | undefined;
  readonly pricingOptions?: readonly BikePricingOption[];
  readonly pricingLocale?: string;
  readonly pricingCurrency?: string;
  readonly selected?: boolean;
  readonly onRentNow: () => void;
  readonly onHelp: () => void;
  readonly onRing?: () => void;
  readonly onDamage: () => void;
}

export function BikeCard({
  bike,
  distanceLabel,
  pricingOptions = getPricingOptionsFromBike(bike),
  pricingLocale = "en-US",
  pricingCurrency = "USD",
  selected = false,
  onRentNow,
  onHelp,
  onRing,
  onDamage
}: BikeCardProps) {
  const rentDisabled = bike.status !== "available";

  function handleRentNow() {
    if (rentDisabled) {
      return;
    }

    onRentNow();
  }

  return (
    <SurfaceCard tone={selected ? "accent" : "default"}>
      <View
        style={{
          minHeight: sizes.bikeCardMinHeight,
          gap: spacing.md
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <AppText variant="h3">{bike.model}</AppText>
            <AppText variant="body">
              {bike.location} · {distanceLabel ?? "Distance unavailable"}
            </AppText>
            <AppText variant="caption">
              Range {formatDistanceKm(bike.estimatedRangeKm)} · {bike.pricingLabel}
            </AppText>
          </View>
          <Chip label={getBikeStatusChipLabel(bike.status)} active={bike.status === "available"} />
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {pricingOptions.map((pricingOption) => (
            <PricingCard
              key={pricingOption.key}
              title={pricingOption.title}
              price={formatPricingOptionPrice(pricingOption, pricingLocale, pricingCurrency)}
              subtitle={pricingOption.subtitle}
              featured={pricingOption.featured ?? false}
            />
          ))}
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {onRing ? <Chip label="Ring" onPress={onRing} /> : <Chip label="Ring" />}
          <Chip label="Bike damage" onPress={onDamage} />
          <Chip label="Help" onPress={onHelp} />
        </View>

        <PrimaryButton label="Rent now" onPress={handleRentNow} disabled={rentDisabled} />
        <AppText variant="caption" color={colors.textMuted}>
          Bike #{bike.id}
        </AppText>
      </View>
    </SurfaceCard>
  );
}
