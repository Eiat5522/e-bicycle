import { fireEvent, render, screen } from "@testing-library/react-native";
import type { ComponentProps } from "react";

import type { Bike } from "@glide/shared";

import { BikeCard } from "./bike-card";

const baseBike: Bike = {
  id: "G-104",
  model: "Glide Pro X",
  rideClass: "Pro",
  estimatedRangeKm: 45,
  topSpeedKmh: 25,
  pricingLabel: "$1.20 / 10 min",
  status: "available",
  location: "Mission District",
  coordinates: { latitude: 37.7599, longitude: -122.4148 },
  lastReportedAt: "2026-04-06T08:55:00Z"
};

function renderBikeCard(overrides: Partial<ComponentProps<typeof BikeCard>> = {}) {
  const props: ComponentProps<typeof BikeCard> = {
    bike: baseBike,
    onRentNow: jest.fn(),
    onHelp: jest.fn(),
    onRing: jest.fn(),
    onDamage: jest.fn(),
    ...overrides
  };

  render(<BikeCard {...props} />);

  return props;
}

describe("BikeCard", () => {
  it("invokes rent now for available bikes", () => {
    const props = renderBikeCard();

    fireEvent.press(screen.getByText("Rent now"));

    expect(props.onRentNow).toHaveBeenCalledTimes(1);
  });

  it("does not invoke rent now for unavailable bikes", () => {
    const props = renderBikeCard({
      bike: {
        ...baseBike,
        status: "reserved"
      }
    });

    fireEvent.press(screen.getByText("Rent now"));

    expect(props.onRentNow).not.toHaveBeenCalled();
  });

  it("formats provided pricing options with locale and currency", () => {
    renderBikeCard({
      pricingLocale: "en-GB",
      pricingCurrency: "GBP",
      pricingOptions: [
        {
          key: "unlock",
          title: "Unlock",
          priceInMinorUnits: 125,
          unit: "ride",
          subtitle: "Start your ride"
        },
        {
          key: "minute",
          title: "Pay as you go",
          priceNumber: 0.33,
          unit: "min",
          subtitle: "Ideal for quick trips",
          featured: true
        }
      ]
    });

    expect(screen.getByText("£1.25/ride")).toBeTruthy();
    expect(screen.getByText("£0.33/min")).toBeTruthy();
  });
});
