import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useRouter } from "expo-router";

import { configuredBikeService } from "@/lib/bike-service";

import { MapScreen, MAP_POLL_INTERVAL_MS } from "./map-screen";
import { MapCanvas } from "./map-canvas";

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
  getLastKnownPositionAsync: jest.fn(),
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
  const getLastKnownPositionAsync = jest.mocked(Location.getLastKnownPositionAsync);
  const selectionAsync = jest.mocked(Haptics.selectionAsync);
  const push = jest.fn();
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
    getLastKnownPositionAsync.mockResolvedValue(null);
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

    expect(screen.queryByText("View Details")).toBeNull();
    expect(screen.getByText("Long press this card for quick actions.")).toBeTruthy();

    expect(listNearby).toHaveBeenCalledWith({
      latitude: 37.7749,
      longitude: -122.4194,
      radiusMeters: 1500,
      limit: 50
    });
  });

  it("falls back to the default map coordinates when live location times out", async () => {
    getCurrentPositionAsync.mockRejectedValue(new Error("Network request timed out"));

    await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Glide Pro X")).toBeTruthy();
      expect(screen.getByText("Refresh paused")).toBeTruthy();
    });

    expect(listNearby).toHaveBeenCalledWith({
      latitude: 13.7563,
      longitude: 100.5018,
      radiusMeters: 1500,
      limit: 50
    });
    expect(
      screen.getByText("Live location timed out. Showing bikes near central Bangkok for now.")
    ).toBeTruthy();
  });

  it("passes available and in-use bikes to the map canvas", async () => {
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
        },
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
        }
      ],
      serverTime: "2026-04-06T09:00:00Z"
    });

    await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Glide Pro X")).toBeTruthy();
    });

    const mapCanvasMock = jest.mocked(MapCanvas);
    const latestCall = mapCanvasMock.mock.calls.at(-1);

    expect(latestCall?.[0].bikes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "G-104", status: "available" }),
        expect.objectContaining({ id: "G-205", status: "in_use" })
      ])
    );
    expect(latestCall?.[0].bikeDistanceLabels).toMatchObject({
      "G-104": expect.stringMatching(/km away$/),
      "G-205": expect.stringMatching(/km away$/)
    });
  });

  it("renders cards for all nearby bikes below the map", async () => {
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
        },
        {
          id: "G-318",
          model: "Glide Lite",
          rideClass: "Urban",
          estimatedRangeKm: 28,
          topSpeedKmh: 20,
          pricingLabel: "$0.80 / 10 min",
          status: "available",
          location: "Ari Soi 1",
          coordinates: { latitude: 13.7797, longitude: 100.5446 },
          lastReportedAt: "2026-04-06T08:58:00Z"
        }
      ],
      serverTime: "2026-04-06T09:00:00Z"
    });

    await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Glide Pro X")).toBeTruthy();
      expect(screen.getByText("Glide City")).toBeTruthy();
      expect(screen.getByText("Glide Lite")).toBeTruthy();
    });

    expect(screen.getAllByText(/km away/).length).toBeGreaterThan(0);
  });

  it("sorts bikes by distance from the current user location", async () => {
    getCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: 13.7563,
        longitude: 100.5018
      }
    } as Location.LocationObject);
    listNearby.mockResolvedValue({
      bikes: [
        {
          id: "G-620",
          model: "Glide Street+",
          rideClass: "Pro",
          estimatedRangeKm: 47,
          topSpeedKmh: 25,
          pricingLabel: "$1.20 / 10 min",
          status: "available",
          location: "Phrom Phong BTS",
          coordinates: { latitude: 13.7301, longitude: 100.5697 },
          lastReportedAt: "2026-04-06T08:59:00Z"
        },
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
          id: "G-318",
          model: "Glide Lite",
          rideClass: "Urban",
          estimatedRangeKm: 28,
          topSpeedKmh: 20,
          pricingLabel: "$0.80 / 10 min",
          status: "available",
          location: "Ari Soi 1",
          coordinates: { latitude: 13.7797, longitude: 100.5446 },
          lastReportedAt: "2026-04-06T08:58:00Z"
        }
      ],
      serverTime: "2026-04-06T09:00:00Z"
    });

    await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Glide Street+")).toBeTruthy();
    });

    const mapCanvasMock = jest.mocked(MapCanvas);
    const latestCall = mapCanvasMock.mock.calls.at(-1);
    const orderedIds = latestCall?.[0].bikes.map((bike) => bike.id);

    expect(orderedIds).toEqual(["G-104", "G-318", "G-620"]);
  });

  it("selects a card without navigating and shows actions for the selected bike", async () => {
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

    await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Glide City")).toBeTruthy();
    });

    fireEvent.press(screen.getByLabelText("Select Glide City"));

    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByText("View Details")).toBeNull();
    expect(screen.getByText("Long press this card for quick actions.")).toBeTruthy();
  });

  it("lets marker selection drive the selected card", async () => {
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

    await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Glide City")).toBeTruthy();
    });

    const mapCanvasMock = jest.mocked(MapCanvas);
    const selectBikeFromMap = mapCanvasMock.mock.calls.at(-1)?.[0].onSelectBike;

    expect(selectBikeFromMap).toBeDefined();

    act(() => {
      selectBikeFromMap?.("G-205");
    });

    expect(screen.queryByText("View Details")).toBeNull();
    expect(screen.getByText("Long press this card for quick actions.")).toBeTruthy();
  });

  it("opens quick actions on long press and routes from explicit actions", async () => {
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

    await renderScreen();

    await waitFor(() => {
      expect(screen.getByText("Glide City")).toBeTruthy();
    });

    fireEvent(screen.getByLabelText("Select Glide City"), "longPress");

    expect(selectionAsync).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Quick actions")).toBeTruthy();
    expect(screen.getByText("View Details")).toBeTruthy();
    expect(screen.queryByText("Hide Quick Actions")).toBeNull();

    fireEvent.press(screen.getByText("Unlock and Ride"));
    expect(push).toHaveBeenCalledWith("/unlock/G-205");

    fireEvent.press(screen.getByText("Need Help?"));
    expect(push).toHaveBeenCalledWith("/help");

    fireEvent.press(screen.getByText("View Details"));
    expect(push).toHaveBeenCalledWith("/bike/G-205");
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
