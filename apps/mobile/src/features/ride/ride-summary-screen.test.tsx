import { fireEvent, render, screen } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { configuredRideHistoryService } from "@/lib/ride-history-service";
import { RideSummaryScreen } from "./ride-summary-screen";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn()
}));

jest.mock("@/lib/ride-history-service", () => ({
  configuredRideHistoryService: {
    getRideHistoryById: jest.fn()
  }
}));

jest.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true
}));

describe("RideSummaryScreen", () => {
  const replace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(configuredRideHistoryService.getRideHistoryById).mockResolvedValue({
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

  it("renders the completed ride summary from Supabase", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: "ride-new", milestone: "first_ride" });

    render(<RideSummaryScreen />);

    expect(await screen.findByText("฿4.80")).toBeTruthy();
    expect(screen.getByText("Distance: 3.4 km")).toBeTruthy();
    expect(screen.getByText("CO2 saved: 0.9 kg")).toBeTruthy();
    expect(screen.getByText("Route: อโศก Interchange to Benjakitti Park")).toBeTruthy();
    expect(screen.getByText("🎊✨ First ride milestone complete!")).toBeTruthy();
  });

  it("shows an unavailable state when the ride is missing", async () => {
    jest.mocked(configuredRideHistoryService.getRideHistoryById).mockResolvedValueOnce(undefined);
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: "missing-ride" });

    render(<RideSummaryScreen />);

    expect(await screen.findByText("Ride unavailable")).toBeTruthy();
  });

  it("shows an error state when the ride summary fails to load", async () => {
    jest
      .mocked(configuredRideHistoryService.getRideHistoryById)
      .mockRejectedValueOnce(new Error("Summary offline"));
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: "ride-new" });

    render(<RideSummaryScreen />);

    expect(await screen.findByText("Ride summary unavailable")).toBeTruthy();
    expect(screen.getByText("Summary offline")).toBeTruthy();
  });

  it("routes back to the map from the unavailable state", async () => {
    jest.mocked(configuredRideHistoryService.getRideHistoryById).mockResolvedValueOnce(undefined);
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: "missing-ride" });

    render(<RideSummaryScreen />);

    fireEvent.press(await screen.findByText("Back to Map"));

    expect(replace).toHaveBeenCalledWith("/(tabs)");
  });
});
