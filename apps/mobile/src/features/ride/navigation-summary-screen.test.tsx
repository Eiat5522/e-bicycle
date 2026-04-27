import { fireEvent, render, screen } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { getWalkingRouteSummary } from "@/lib/mapbox-directions";

import { NavigationSummaryScreen } from "./navigation-summary-screen";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn()
}));

jest.mock("@/lib/mapbox-directions", () => ({
  getWalkingRouteSummary: jest.fn()
}));

describe("NavigationSummaryScreen", () => {
  const replace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(useLocalSearchParams).mockReturnValue({
      bikeId: "G-104",
      bikeModel: "Glide Pro X",
      destinationName: "Siam Square",
      destinationLatitude: "13.7466",
      destinationLongitude: "100.5328",
      originName: "Current location",
      originLatitude: "13.7563",
      originLongitude: "100.5018"
    });
  });

  it("renders the primary and alternate walking routes", async () => {
    jest.mocked(getWalkingRouteSummary).mockResolvedValue({
      alternateRoutes: [
        {
          distanceMeters: 1030,
          durationSec: 720,
          label: "Henri Dunant Road"
        }
      ],
      primaryRoute: {
        distanceMeters: 840,
        durationSec: 600,
        label: "Rama I Road"
      }
    });

    render(<NavigationSummaryScreen />);

    expect(await screen.findByText("Walk to Glide Pro X")).toBeTruthy();
    expect(screen.getByText("Current location")).toBeTruthy();
    expect(screen.getByText("Siam Square")).toBeTruthy();
    expect(screen.getByText("0.8 km")).toBeTruthy();
    expect(screen.getByText("10 min")).toBeTruthy();
    expect(screen.getByText("Primary route")).toBeTruthy();
    expect(screen.getByText("Rama I Road")).toBeTruthy();
    expect(screen.getByText("Alternate route")).toBeTruthy();
    expect(screen.getByText("Henri Dunant Road")).toBeTruthy();
  });

  it("shows a fallback notice when Mapbox directions are unavailable", async () => {
    jest.mocked(getWalkingRouteSummary).mockResolvedValue(null);

    render(<NavigationSummaryScreen />);

    expect(await screen.findByText("Route preview unavailable")).toBeTruthy();
    expect(screen.getByText("Current location")).toBeTruthy();
    expect(screen.getByText("Siam Square")).toBeTruthy();
  });

  it("routes back to the map", async () => {
    jest.mocked(getWalkingRouteSummary).mockResolvedValue(null);

    render(<NavigationSummaryScreen />);

    fireEvent.press(await screen.findByText("Back to Map"));

    expect(replace).toHaveBeenCalledWith("/(tabs)");
  });
});
