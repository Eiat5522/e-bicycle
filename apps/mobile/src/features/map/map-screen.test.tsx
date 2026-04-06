import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as Location from "expo-location";

import { configuredBikeService } from "@/lib/bike-service";

import { MapScreen, MAP_POLL_INTERVAL_MS } from "./map-screen";

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

describe("MapScreen", () => {
  const listNearby = jest.mocked(configuredBikeService.listNearby);
  const requestForegroundPermissionsAsync = jest.mocked(
    Location.requestForegroundPermissionsAsync
  );
  const getCurrentPositionAsync = jest.mocked(Location.getCurrentPositionAsync);
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    requestForegroundPermissionsAsync.mockResolvedValue({
      granted: true
    } as Location.LocationPermissionResponse);
    getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 37.7749,
        longitude: -122.4194
      }
    } as Location.LocationObject);
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
      serverTime: "2026-04-06T09:00:00Z",
      searchCenter: { latitude: 37.7749, longitude: -122.4194 }
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleErrorSpy.mockRestore();
  });

  async function renderScreen() {
    render(<MapScreen />);
  }

  it("requests location and renders the selected nearby bike", async () => {
    await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Glide Pro X")).toBeTruthy();
    });

    expect(listNearby).toHaveBeenCalledWith({
      latitude: 37.7749,
      longitude: -122.4194,
      radiusMeters: 1500,
      limit: 50
    });
  });

  it("renders a permission denied state with retry", async () => {
    requestForegroundPermissionsAsync.mockResolvedValue({
      granted: false
    } as Location.LocationPermissionResponse);

    await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Location access is off")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Try Again"));

    expect(requestForegroundPermissionsAsync).toHaveBeenCalledTimes(2);
  });

  it("renders an empty state when no bikes are returned", async () => {
    listNearby.mockResolvedValue({
      bikes: [],
      serverTime: "2026-04-06T09:00:00Z"
    });

    await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("No bikes nearby right now")).toBeTruthy();
    });
  });

  it("polls for nearby bikes while focused", async () => {
    jest.useFakeTimers();

    await renderScreen();

    await waitFor(() => {
      expect(listNearby).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      jest.advanceTimersByTime(MAP_POLL_INTERVAL_MS);
    });

    await waitFor(() => {
      expect(listNearby).toHaveBeenCalledTimes(2);
    });
  });

  it("keeps cached bikes visible when a poll refresh fails", async () => {
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

    await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Glide Pro X")).toBeTruthy();
    });

    await act(async () => {
      jest.advanceTimersByTime(MAP_POLL_INTERVAL_MS);
    });

    await waitFor(() => {
      expect(screen.getByText("Refresh paused")).toBeTruthy();
    });

    expect(screen.getByText("Glide Pro X")).toBeTruthy();
  });
});
