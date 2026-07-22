import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "@/features/auth/auth-provider";
import { configuredBikeService } from "@/lib/bike-service";
import { configuredBikeStatusService } from "@/lib/bike-status-service";
import { configuredRideHistoryService } from "@/lib/ride-history-service";
import { configuredWalletService } from "@/lib/wallet-service";
import { ActiveRideScreen } from "./active-ride-screen";
import { useLiveRideTracker } from "./live-ride-tracker";
import { useRideSession } from "./ride-session-context";

jest.mock("@react-native-async-storage/async-storage", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("@react-native-async-storage/async-storage/jest/async-storage-mock");
});

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

jest.mock("@/lib/bike-service", () => ({
  configuredBikeService: {
    getById: jest.fn(),
    listNearby: jest.fn()
  }
}));

jest.mock("@/lib/bike-status-service", () => ({
  configuredBikeStatusService: {
    updateBikeStatus: jest.fn()
  }
}));

jest.mock("@/lib/wallet-service", () => ({
  configuredWalletService: {
    getWallet: jest.fn()
  }
}));

jest.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true
}));

jest.mock("./live-ride-tracker", () => ({
  useLiveRideTracker: jest.fn()
}));

jest.mock("./ride-session-context", () => ({
  useRideSession: jest.fn()
}));

jest.mock("@/features/auth/auth-provider", () => ({
  useAuth: jest.fn()
}));

function createMockSnapshot() {
  return {
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
  };
}

describe("ActiveRideScreen", () => {
  const push = jest.fn();
  const setBikeRideState = jest.fn();
  const activeBike = {
    id: "G-205",
    model: "Glide City Live",
    imageUrl: "https://cdn.example.com/bikes/G-205.webp",
    rideClass: "City",
    estimatedRangeKm: 31,
    topSpeedKmh: 22,
    pricingLabel: "฿0.90 / 10 min",
    ratePerMinute: 0.09,
    status: "in_use",
    activeRiderId: "user-1",
    location: "อโศก Interchange",
    coordinates: { latitude: 13.7372, longitude: 100.5606 },
    lastReportedAt: "2026-04-06T08:56:00Z"
  } as const;

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(useRideSession).mockReturnValue({
      bikeRideOverrides: {},
      setBikeRideState
    });
    jest.mocked(useAuth).mockReturnValue({
      session: { access_token: "session-token" },
      user: { id: "user-1" }
    } as ReturnType<typeof useAuth>);
    jest.mocked(useLiveRideTracker).mockReturnValue({
      trackingState: "mock",
      warningMessage: "Using simulated ride tracking for this environment.",
      dropoffGuidance: {
        zone: {
          id: "benjakitti",
          label: "Benjakitti Park",
          coordinates: { latitude: 13.7319, longitude: 100.5459 },
          distanceKm: 0.7
        },
        remainingDistanceKm: 0.7,
        state: "en_route"
      },
      nearestDropoff: {
        id: "benjakitti",
        label: "Benjakitti Park",
        coordinates: { latitude: 13.7319, longitude: 100.5459 },
        distanceKm: 0.7
      },
      snapshot: createMockSnapshot()
    });
    jest.mocked(configuredBikeService.getById).mockResolvedValue(activeBike);
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
    jest.mocked(configuredBikeStatusService.updateBikeStatus).mockResolvedValue(undefined);
    jest.mocked(configuredWalletService.getWallet).mockResolvedValue({
      balance: 20,
      points: 150,
      paymentMethods: ["Visa **** 4242"],
      transactions: [
        {
          id: "reward-recent",
          type: "reward",
          title: "Milestone unlocked: First ride",
          subtitle: "Milestone key: first_ride",
          amount: 20,
          timestamp: new Date().toISOString()
        }
      ]
    });
  });

  it("restores a persisted active ride after relaunch and fetches the real bike metadata", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({});
    await AsyncStorage.setItem(
      "active_ride_session",
      JSON.stringify({
        bikeId: "G-205",
        startedAtMs: 1712225700000,
        route: [
          { latitude: 13.7372, longitude: 100.5606 },
          { latitude: 13.7365, longitude: 100.5577 }
        ],
        bike: {
          id: "G-205",
          model: "Glide City",
          location: "อโศก Interchange",
          coordinates: { latitude: 13.7372, longitude: 100.5606 },
          ratePerMinute: 0.09
        }
      })
    );

    render(<ActiveRideScreen />);

    expect(await screen.findByText("G-205 is tracking live")).toBeTruthy();
    expect(screen.getByText("Glide City Live")).toBeTruthy();
    expect(jest.mocked(configuredBikeService.getById)).toHaveBeenCalledWith("G-205");
  });

  it("persists the live ride session while the dashboard is open", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ bikeId: "G-205" });

    render(<ActiveRideScreen />);

    await screen.findByText("Live Ride Companion");
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "active_ride_session",
        expect.stringContaining("\"bikeId\":\"G-205\"")
      );
    });
  });

  it("shows a clean empty state when no ride session exists", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({});

    render(<ActiveRideScreen />);

    expect(await screen.findByText("No active ride session")).toBeTruthy();
    expect(screen.getByText("Go to map")).toBeTruthy();
  });

  it("renders the unlock arrival overlay when entering from the unlock flow", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({
      bikeId: "G-205",
      entry: "unlock"
    });

    render(<ActiveRideScreen />);

    await screen.findByText("G-205 is tracking live");
    expect(screen.getByText("Bike unlocked")).toBeTruthy();
    expect(screen.getByText("G-205 is tracking live")).toBeTruthy();
    expect(screen.getByText("Ride live now")).toBeTruthy();
  });

  it("creates a completed ride and navigates to the summary when ending the ride", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ bikeId: "G-205" });

    render(<ActiveRideScreen />);

    await screen.findByText("Live Ride Companion");
    expect(screen.queryByText("Bike unlocked")).toBeNull();
    expect(screen.getByText("Live Ride Companion")).toBeTruthy();
    expect(screen.getByText("Distance")).toBeTruthy();
    expect(screen.getByText("CO2 saved")).toBeTruthy();
    expect(screen.getByText("Recommended drop-off")).toBeTruthy();
    expect(screen.getByText("Benjakitti Park")).toBeTruthy();
    expect(screen.getByText("0.7 km remaining")).toBeTruthy();
    expect(screen.getByText("Using simulated ride tracking for this environment.")).toBeTruthy();

    fireEvent.press(screen.getByText("End Ride"));

    await waitFor(() => {
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
    });

    await waitFor(() => {
      expect(configuredBikeStatusService.updateBikeStatus).toHaveBeenCalledWith({
        actorId: "user-1",
        bikeId: "G-205",
        status: "available"
      });
    });

    await waitFor(() => {
      expect(setBikeRideState).toHaveBeenCalledWith("G-205", {
        status: "available",
        activeRiderId: null
      });
    });

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith({
        pathname: "/ride/summary",
        params: { id: "ride-new", milestone: "first_ride" }
      });
    });
  });

  it("does not complete the ride when the bike status sync fails", async () => {
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    jest.mocked(useLocalSearchParams).mockReturnValue({ bikeId: "G-205" });
    jest
      .mocked(configuredBikeStatusService.updateBikeStatus)
      .mockRejectedValueOnce(
        new Error("Supabase configuration is required to sync bike status changes.")
      );

    render(<ActiveRideScreen />);

    await screen.findByText("Live Ride Companion");
    fireEvent.press(screen.getByText("End Ride"));

    await waitFor(() => {
      expect(configuredBikeStatusService.updateBikeStatus).toHaveBeenCalledWith({
        actorId: "user-1",
        bikeId: "G-205",
        status: "available"
      });
    });

    await waitFor(() => {
      expect(setBikeRideState).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
    });

    expect(
      await screen.findByText(
        "Supabase configuration is required to sync bike status changes."
      )
    ).toBeTruthy();

    consoleError.mockRestore();
  });

  it("shows an inline error when completing the ride fails", async () => {
    jest
      .mocked(configuredRideHistoryService.completeRide)
      .mockRejectedValueOnce(new Error("Ride completion failed"));
    jest.mocked(useLocalSearchParams).mockReturnValue({ bikeId: "G-205" });

    render(<ActiveRideScreen />);

    await screen.findByText("Live Ride Companion");
    fireEvent.press(screen.getByText("End Ride"));

    expect(await screen.findByText("Ride completion failed")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows one-time arrival feedback when the rider reaches the drop-off zone", async () => {
    jest.useFakeTimers();
    jest.mocked(useLocalSearchParams).mockReturnValue({ bikeId: "G-205" });
    jest.mocked(useLiveRideTracker).mockReturnValue({
      trackingState: "live",
      warningMessage: null,
      dropoffGuidance: {
        zone: {
          id: "benjakitti",
          label: "Benjakitti Park",
          coordinates: { latitude: 13.7319, longitude: 100.5459 },
          distanceKm: 0
        },
        remainingDistanceKm: 0,
        state: "arrived"
      },
      nearestDropoff: {
        id: "benjakitti",
        label: "Benjakitti Park",
        coordinates: { latitude: 13.7319, longitude: 100.5459 },
        distanceKm: 0
      },
      snapshot: createMockSnapshot()
    });

    const rendered = render(<ActiveRideScreen />);

    await screen.findByText("You are inside the drop-off zone.");
    expect(screen.getByText("You are inside the drop-off zone.")).toBeTruthy();
    expect(screen.getByText("Park safely at Benjakitti Park, then end your ride when you are ready.")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(2800);
    });

    expect(screen.queryByText("You are inside the drop-off zone.")).toBeNull();
    expect(screen.queryByText("Park safely at Benjakitti Park, then end your ride when you are ready.")).toBeNull();

    rendered.rerender(<ActiveRideScreen />);

    expect(screen.queryByText("You are inside the drop-off zone.")).toBeNull();
    expect(screen.queryByText("Park safely at Benjakitti Park, then end your ride when you are ready.")).toBeNull();

    jest.useRealTimers();
  });
});
