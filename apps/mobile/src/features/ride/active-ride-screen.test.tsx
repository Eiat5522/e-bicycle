import { fireEvent, render, screen } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "@/features/auth/auth-provider";
import { configuredBikeStatusService } from "@/lib/bike-status-service";
import { configuredRideHistoryService } from "@/lib/ride-history-service";
import { ActiveRideScreen } from "./active-ride-screen";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn()
}));

jest.mock("@/features/auth/auth-provider", () => ({
  useAuth: jest.fn()
}));

jest.mock("@/lib/ride-history-service", () => ({
  configuredRideHistoryService: {
    completeDemoRide: jest.fn()
  }
}));

jest.mock("@/lib/bike-status-service", () => ({
  configuredBikeStatusService: {
    updateBikeStatus: jest.fn()
  }
}));

jest.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true
}));

describe("ActiveRideScreen", () => {
  const push = jest.fn();
  const updateBikeStatus = jest.mocked(configuredBikeStatusService.updateBikeStatus);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(useAuth).mockReturnValue({
      session: { access_token: "session-token" } as never,
      user: { id: "user-1" } as never
    } as never);
    updateBikeStatus.mockResolvedValue(undefined);
    jest.mocked(configuredRideHistoryService.completeDemoRide).mockResolvedValue({
      id: "ride-new",
      bikeId: "G-205",
      bikeModel: "Glide City",
      startedAt: "2026-04-04T10:15:00Z",
      completedAt: "2026-04-04T10:41:00Z",
      durationSec: 1560,
      distanceKm: 3.4,
      totalCost: 4.8,
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
    expect(screen.getByText("G-205 is unlocked and moving")).toBeTruthy();
    expect(screen.getByText("Ride live now")).toBeTruthy();
  });

  it("creates a completed ride and navigates to the summary when ending the ride", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({});

    render(<ActiveRideScreen />);

    expect(screen.queryByText("Bike unlocked")).toBeNull();
    expect(screen.getByText("Ride corridor")).toBeTruthy();
    expect(screen.getByText(/Current cost:/)).toBeTruthy();
    expect(screen.getByText(/Session ID:/)).toBeTruthy();

    fireEvent.press(screen.getByText("End Ride"));

    expect(await screen.findByText("End Ride")).toBeTruthy();
    expect(updateBikeStatus).toHaveBeenCalledWith({
      bikeId: "G-205",
      status: "available",
      accessToken: "session-token"
    });
    expect(configuredRideHistoryService.completeDemoRide).toHaveBeenCalledWith({ bikeId: "G-205" });
    expect(push).toHaveBeenCalledWith({
      pathname: "/ride/summary",
      params: { id: "ride-new" }
    });
  });

  it("shows an inline error when completing the ride fails", async () => {
    jest
      .mocked(configuredRideHistoryService.completeDemoRide)
      .mockRejectedValueOnce(new Error("Ride completion failed"));
    jest.mocked(useLocalSearchParams).mockReturnValue({});

    render(<ActiveRideScreen />);

    fireEvent.press(screen.getByText("End Ride"));

    expect(await screen.findByText("Ride completion failed")).toBeTruthy();
    expect(push).not.toHaveBeenCalled();
  });
});
