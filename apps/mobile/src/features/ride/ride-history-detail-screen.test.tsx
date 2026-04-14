import { fireEvent, render, screen } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text as MockText } from "react-native";

import { configuredRideHistoryService } from "@/lib/ride-history-service";
import { RideHistoryDetailScreen } from "./ride-history-detail-screen";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn()
}));

jest.mock("./ride-replay-map", () => ({
  RideReplayMap: jest.fn(({ ride }) => <MockText>Replay map for {ride.routeLabel}</MockText>)
}));

jest.mock("@/lib/ride-history-service", () => ({
  configuredRideHistoryService: {
    getRideHistoryById: jest.fn()
  }
}));

describe("RideHistoryDetailScreen", () => {
  const replace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(configuredRideHistoryService.getRideHistoryById).mockResolvedValue({
      id: "ride-history-1",
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
      paymentLabel: "Charged to Visa **** 4242",
      route: [],
      checkpoints: []
    });
  });

  it("renders the selected ride details", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: "ride-history-1" });

    render(<RideHistoryDetailScreen />);

    expect(await screen.findByText("Ride Details")).toBeTruthy();
    expect(screen.getAllByText("อโศก Interchange to Benjakitti Park").length).toBeGreaterThan(0);
    expect(screen.getByText("Charged to Visa **** 4242")).toBeTruthy();
    expect(screen.getByText("Replay map for อโศก Interchange to Benjakitti Park")).toBeTruthy();
    expect(screen.getByText("Route details")).toBeTruthy();
  });

  it("routes back to profile when the ride is missing", async () => {
    jest.mocked(configuredRideHistoryService.getRideHistoryById).mockResolvedValueOnce(undefined);
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: "missing-ride" });

    render(<RideHistoryDetailScreen />);

    fireEvent.press(await screen.findByText("Back to Profile"));

    expect(replace).toHaveBeenCalledWith("/(tabs)/profile");
  });

  it("renders an error state when the ride fetch fails", async () => {
    jest
      .mocked(configuredRideHistoryService.getRideHistoryById)
      .mockRejectedValueOnce(new Error("Ride detail offline"));
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: "ride-history-1" });

    render(<RideHistoryDetailScreen />);

    expect(await screen.findByText("Ride details unavailable")).toBeTruthy();
    expect(screen.getByText("Ride detail offline")).toBeTruthy();
  });
});
