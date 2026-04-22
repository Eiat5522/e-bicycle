import { fireEvent, render, screen } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { configuredRideHistoryService } from "@/lib/ride-history-service";
import { ActiveRideScreen } from "./active-ride-screen";
import { useLiveRideTracker } from "./live-ride-tracker";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn()
}));

jest.mock("@/lib/ride-history-service", () => ({
  configuredRideHistoryService: {
    completeRide: jest.fn(),
    completeDemoRide: jest.fn()
  }
}));

jest.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true
}));

jest.mock("./live-ride-tracker", () => ({
  useLiveRideTracker: jest.fn()
}));

describe("ActiveRideScreen", () => {
  const push = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(useLiveRideTracker).mockReturnValue({
      trackingState: "mock",
      warningMessage: "Using simulated ride tracking for this environment.",
      nearestDropoff: {
        id: "benjakitti",
        label: "Benjakitti Park",
        coordinates: { latitude: 13.7319, longitude: 100.5459 },
        distanceKm: 0.7
      },
      snapshot: {
        bikeId: "G-205",
        startedAt: "2026-04-14T10:00:00.000Z",
        durationSec: 125,
        distanceKm: 0.8,
        currentCost: 0.55,
        ratePerMinute: 0.1846,
        co2SavedKg: 0.2,
        startLocation: "อโศก Interchange",
        endLocation: "Benjakitti Park",
        routeLabel: "อโศก Interchange to Benjakitti Park",
        route: [
          { latitude: 13.7372, longitude: 100.5606 },
          { latitude: 13.7319, longitude: 100.5459 }
        ],
        checkpoints: [
          {
            id: "G-205-unlock",
            label: "Unlock",
            description: "Bike unlocked and live ride tracking started.",
            coordinates: { latitude: 13.7372, longitude: 100.5606 },
            elapsedSec: 0
          },
          {
            id: "G-205-dropoff",
            label: "Drop-off",
            description: "Nearest suggested drop-off is Benjakitti Park.",
            coordinates: { latitude: 13.7319, longitude: 100.5459 },
            elapsedSec: 125
          }
        ]
      }
    });
    jest.mocked(configuredRideHistoryService.completeRide).mockResolvedValue({
      id: "ride-new",
      bikeId: "G-205",
      bikeModel: "Glide City",
      startedAt: "2026-04-04T10:15:00Z",
      completedAt: "2026-04-04T10:41:00Z",
      durationSec: 1560,
      distanceKm: 3.4,
      totalCost: 4.8,
      ratePerMinute: 0.1846,
      billableMinutes: 26,
      currencyCode: "THB",
      walletTransactionId: "txn-ride",
      fareCalculationMethod: "ceil_minutes_v1",
      co2SavedKg: 0.9,
      startLocation: "อโศก Interchange",
      endLocation: "Benjakitti Park",
      routeLabel: "อโศก Interchange to Benjakitti Park",
      paymentLabel: "Charged to your Glide wallet",
      route: [],
      checkpoints: []
    });
  });

  it("renders the unlock arrival overlay when entering from the unlock flow", () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({
      bikeId: "G-205",
      entry: "unlock"
    });

    render(<ActiveRideScreen />);

    expect(screen.getByText("Bike unlocked")).toBeTruthy();
    expect(screen.getByText("G-205 is tracking live")).toBeTruthy();
    expect(screen.getByText("Ride live now")).toBeTruthy();
  });

  it("creates a completed ride and navigates to the summary when ending the ride", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({});

    render(<ActiveRideScreen />);

    expect(screen.queryByText("Bike unlocked")).toBeNull();
    expect(screen.getByText("Live Ride Companion")).toBeTruthy();
    expect(screen.getByText("Distance")).toBeTruthy();
    expect(screen.getByText("CO2 saved")).toBeTruthy();
    expect(screen.getByText("Drop-off guidance")).toBeTruthy();
    expect(screen.getByText("Using simulated ride tracking for this environment.")).toBeTruthy();

    fireEvent.press(screen.getByText("End Ride"));

    expect(await screen.findByText("End Ride")).toBeTruthy();
    expect(configuredRideHistoryService.completeRide).toHaveBeenCalledWith({
      bikeId: "G-205",
      durationSec: 125,
      distanceKm: 0.8,
      totalCost: 0.55,
      ratePerMinute: 0.1846,
      routeLabel: "อโศก Interchange to Benjakitti Park",
      endLocation: "Benjakitti Park",
      co2SavedKg: 0.2,
      route: [
        { latitude: 13.7372, longitude: 100.5606 },
        { latitude: 13.7319, longitude: 100.5459 }
      ],
      checkpoints: [
        {
          id: "G-205-unlock",
          label: "Unlock",
          description: "Bike unlocked and live ride tracking started.",
          coordinates: { latitude: 13.7372, longitude: 100.5606 },
          elapsedSec: 0
        },
        {
          id: "G-205-dropoff",
          label: "Drop-off",
          description: "Nearest suggested drop-off is Benjakitti Park.",
          coordinates: { latitude: 13.7319, longitude: 100.5459 },
          elapsedSec: 125
        }
      ]
    });
    expect(push).toHaveBeenCalledWith({
      pathname: "/ride/summary",
      params: { id: "ride-new" }
    });
  });

  it("shows an inline error when completing the ride fails", async () => {
    jest
      .mocked(configuredRideHistoryService.completeRide)
      .mockRejectedValueOnce(new Error("Ride completion failed"));
    jest.mocked(useLocalSearchParams).mockReturnValue({});

    render(<ActiveRideScreen />);

    fireEvent.press(screen.getByText("End Ride"));

    expect(await screen.findByText("Ride completion failed")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });
});
