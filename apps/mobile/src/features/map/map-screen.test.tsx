import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";

import { configuredBikeService } from "@/lib/bike-service";

import { MapCanvas } from "./map-canvas";
import { MAP_POLL_INTERVAL_MS, MapScreen } from "./map-screen";

jest.mock("./map-canvas", () => ({
  MapCanvas: jest.fn(() => null)
}));

jest.mock("@/lib/bike-service", () => ({
  configuredBikeService: {
    listNearby: jest.fn()
  }
}));

jest.mock("expo-location", () => ({
  Accuracy: {
    Balanced: "balanced"
  },
  getCurrentPositionAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn()
}));

jest.mock("@react-navigation/native", () => ({
  useIsFocused: jest.fn(() => true)
}));

jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn()
  }))
}));

jest.mock("expo-haptics", () => ({
  selectionAsync: jest.fn()
}));

describe("MapScreen", () => {
  const listNearby = jest.mocked(configuredBikeService.listNearby);
  const requestForegroundPermissionsAsync = jest.mocked(
    Location.requestForegroundPermissionsAsync
  );
  const getCurrentPositionAsync = jest.mocked(Location.getCurrentPositionAsync);
  const selectionAsync = jest.mocked(Haptics.selectionAsync);
  const push = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    requestForegroundPermissionsAsync.mockResolvedValue({
      granted: true
    } as Location.LocationPermissionResponse);
    getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 37.7749,
        longitude: -122.4194
      }
    } as Location.LocationObject);
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    listNearby.mockResolvedValue({
      bikes: [
        {
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
        }
      ],
      serverTime: "2026-04-06T09:00:00Z"
    });
  });

  it("requests location and renders the selected nearby bike in the sheet", async () => {
    render(<MapScreen />);

    await waitFor(() => {
      expect(screen.getByText("Rent now")).toBeTruthy();
    });

    expect(screen.getAllByText("Glide Pro X").length).toBeGreaterThan(0);
    expect(listNearby).toHaveBeenCalledWith({
      latitude: 37.7749,
      longitude: -122.4194,
      radiusMeters: 1500,
      limit: 50
    });
  });

  it("passes sorted bikes and distance labels to the map canvas", async () => {
    listNearby.mockResolvedValue({
      bikes: [
        {
          id: "G-205",
          model: "Glide City",
          rideClass: "City",
          estimatedRangeKm: 31,
          topSpeedKmh: 22,
          pricingLabel: "$0.90 / 10 min",
          status: "in_use",
          location: "Market Street",
          coordinates: { latitude: 37.7937, longitude: -122.395 },
          lastReportedAt: "2026-04-06T08:56:00Z"
        },
        {
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
        }
      ],
      serverTime: "2026-04-06T09:00:00Z"
    });

    render(<MapScreen />);

    await waitFor(() => {
      expect(screen.getByText("Rent now")).toBeTruthy();
    });

    const latestCall = jest.mocked(MapCanvas).mock.calls.at(-1);
    expect(latestCall?.[0].bikes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "G-104" }),
        expect.objectContaining({ id: "G-205" })
      ])
    );
    expect(latestCall?.[0].bikeDistanceLabels).toMatchObject({
      "G-104": expect.stringMatching(/km away$/),
      "G-205": expect.stringMatching(/km away$/)
    });
  });

  it("updates selected bike from map selection and triggers haptics", async () => {
    listNearby.mockResolvedValue({
      bikes: [
        {
          id: "G-104",
          model: "Glide Pro X",
          rideClass: "Pro",
          estimatedRangeKm: 45,
          topSpeedKmh: 25,
          pricingLabel: "$1.20 / 10 min",
          status: "available",
          location: "Siam Square",
          coordinates: { latitude: 13.7466, longitude: 100.5328 },
          lastReportedAt: "2026-04-06T08:55:00Z"
        },
        {
          id: "G-205",
          model: "Glide City",
          rideClass: "City",
          estimatedRangeKm: 31,
          topSpeedKmh: 22,
          pricingLabel: "$0.90 / 10 min",
          status: "in_use",
          location: "อโศก Interchange",
          coordinates: { latitude: 13.7372, longitude: 100.5606 },
          lastReportedAt: "2026-04-06T08:56:00Z"
        }
      ],
      serverTime: "2026-04-06T09:00:00Z"
    });

    render(<MapScreen />);

    await waitFor(() => {
      expect(screen.getByText("Bike #G-104")).toBeTruthy();
    });

    const selectBikeFromMap = jest.mocked(MapCanvas).mock.calls.at(-1)?.[0].onSelectBike;

    act(() => {
      selectBikeFromMap?.("G-205");
    });

    expect(selectionAsync).toHaveBeenCalled();
    expect(screen.getByText("Bike #G-205")).toBeTruthy();
  });

  it("navigates from bike card actions", async () => {
    render(<MapScreen />);

    await waitFor(() => {
      expect(screen.getByText("Rent now")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Rent now"));
    fireEvent.press(screen.getByText("Help"));
    fireEvent.press(screen.getByText("Bike damage"));

    expect(push).toHaveBeenCalledWith("/unlock/G-104");
    expect(push).toHaveBeenCalledWith("/help");
    expect(push).toHaveBeenCalledWith("/bike/G-104");
  });

  it("renders permission denied state with retry", async () => {
    requestForegroundPermissionsAsync.mockResolvedValue({
      granted: false
    } as Location.LocationPermissionResponse);

    render(<MapScreen />);

    await waitFor(() => {
      expect(screen.getByText("Location access is off")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Try Again"));
    expect(requestForegroundPermissionsAsync).toHaveBeenCalledTimes(2);
  });

  it("polls and keeps cached bikes visible when refresh fails", async () => {
    jest.useFakeTimers();

    listNearby
      .mockResolvedValueOnce({
        bikes: [
          {
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
          }
        ],
        serverTime: "2026-04-06T09:00:00Z"
      })
      .mockRejectedValueOnce(new Error("Refresh unavailable"));

    render(<MapScreen />);

    await waitFor(() => {
      expect(screen.getByText("Bike #G-104")).toBeTruthy();
    });

    await act(async () => {
      jest.advanceTimersByTime(MAP_POLL_INTERVAL_MS);
    });

    await waitFor(() => {
      expect(screen.getByText("Refresh paused")).toBeTruthy();
    });

    expect(screen.getByText("Bike #G-104")).toBeTruthy();
  });
});
