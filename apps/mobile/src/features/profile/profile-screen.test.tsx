import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useEffect } from "react";

import { ProfileScreen } from "./profile-screen";
import { configuredRideHistoryService } from "@/lib/ride-history-service";
import { useAuth } from "../auth/auth-provider";

jest.mock("expo-router", () => ({
  useFocusEffect: jest.fn(),
  useRouter: jest.fn()
}));

jest.mock("../auth/auth-provider", () => ({
  useAuth: jest.fn()
}));

jest.mock("@/lib/ride-history-service", () => ({
  configuredRideHistoryService: {
    getRideHistory: jest.fn()
  }
}));

describe("ProfileScreen", () => {
  const push = jest.fn();
  const signOut = jest.fn();
  const updateDisplayName = jest.fn();

  async function renderProfileScreen() {
    render(<ProfileScreen />);

    await waitFor(() => {
      expect(screen.queryByText("Loading rides")).toBeNull();
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useFocusEffect).mockImplementation((effect) => {
      useEffect(effect, [effect]);
    });
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(useAuth).mockReturnValue({
      profile: { firstName: "Alex" },
      signOut,
      updateDisplayName,
      user: { email: "alex@rideglide.app" }
    } as never);
    jest.mocked(configuredRideHistoryService.getRideHistory).mockResolvedValue([
      {
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
      },
      {
        id: "ride-history-2",
        bikeId: "G-509",
        bikeModel: "Glide Metro",
        startedAt: "2026-04-02T05:30:00Z",
        completedAt: "2026-04-02T05:50:00Z",
        durationSec: 1200,
        distanceKm: 2.6,
        totalCost: 3.95,
        co2SavedKg: 0.6,
        startLocation: "Silom Complex",
        endLocation: "Lumphini Park West Gate",
        routeLabel: "Silom lunch loop",
        paymentLabel: "Charged to Visa **** 0188",
        route: [],
        checkpoints: []
      }
    ]);
  });

  it("renders Supabase-backed profile details and ride history", async () => {
    await renderProfileScreen();

    const displayNameInput = screen.getByPlaceholderText("Enter your display name");

    expect(screen.getByText("Alex")).toBeTruthy();
    expect(screen.getByText("alex@rideglide.app")).toBeTruthy();
    expect(screen.getByDisplayValue("Alex")).toBeTruthy();
    expect(displayNameInput.props.editable).toBe(false);
    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.queryByText("Save Display Name")).toBeNull();
    expect(screen.getByText("Ride history")).toBeTruthy();
    expect(
      await screen.findByLabelText("Open ride details for อโศก Interchange to Benjakitti Park")
    ).toBeTruthy();
    expect(screen.getByText("Silom lunch loop")).toBeTruthy();
  });

  it("navigates to the ride detail screen when a ride card is pressed", async () => {
    await renderProfileScreen();

    fireEvent.press(
      await screen.findByLabelText("Open ride details for อโศก Interchange to Benjakitti Park")
    );

    expect(push).toHaveBeenCalledWith("../ride/history/ride-history-1");
  });

  it("renders an empty ride history state when no rides exist", async () => {
    jest.mocked(configuredRideHistoryService.getRideHistory).mockResolvedValueOnce([]);

    await renderProfileScreen();

    expect(await screen.findByText("No completed rides yet")).toBeTruthy();
  });

  it("renders a retryable ride history error", async () => {
    jest.mocked(configuredRideHistoryService.getRideHistory).mockRejectedValueOnce(
      new Error("Ride history offline")
    );

    await renderProfileScreen();

    expect(await screen.findByText("Ride history unavailable")).toBeTruthy();
    expect(screen.getByText("Ride history offline")).toBeTruthy();
    expect(screen.getByText("Retry")).toBeTruthy();
  });

  it("signs out from the profile footer", async () => {
    await renderProfileScreen();

    fireEvent.press(screen.getByText("Sign Out"));

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("updates the display name from the profile card", async () => {
    await renderProfileScreen();

    fireEvent.press(screen.getByText("Edit"));
    fireEvent.changeText(screen.getByPlaceholderText("Enter your display name"), "  Taylor  ");

    await act(async () => {
      fireEvent.press(screen.getByText("Save Display Name"));
    });

    expect(updateDisplayName).toHaveBeenCalledWith("Taylor");
    expect(screen.getByPlaceholderText("Enter your display name").props.editable).toBe(false);
    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.queryByText("Save Display Name")).toBeNull();
  });

  it("shows a validation error when the display name is empty", async () => {
    await renderProfileScreen();

    fireEvent.press(screen.getByText("Edit"));
    fireEvent.changeText(screen.getByPlaceholderText("Enter your display name"), "   ");
    fireEvent.press(screen.getByText("Save Display Name"));

    expect(updateDisplayName).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a display name.")).toBeTruthy();
    expect(screen.getByPlaceholderText("Enter your display name").props.editable).toBe(true);
  });

  it("surfaces display-name save errors inline", async () => {
    updateDisplayName.mockRejectedValueOnce(new Error("Profile update failed"));

    await renderProfileScreen();

    fireEvent.press(screen.getByText("Edit"));
    fireEvent.changeText(screen.getByPlaceholderText("Enter your display name"), "Taylor");

    await act(async () => {
      fireEvent.press(screen.getByText("Save Display Name"));
    });

    expect(screen.getByText("Profile update failed")).toBeTruthy();
    expect(screen.getByPlaceholderText("Enter your display name").props.editable).toBe(true);
  });

  it("routes to support and wallet shortcuts", async () => {
    await renderProfileScreen();

    fireEvent.press(screen.getByText("Open Support"));
    fireEvent.press(screen.getByText("View Wallet"));

    expect(push).toHaveBeenCalledWith("/help");
    expect(push).toHaveBeenCalledWith("/(tabs)/wallet");
  });
});
