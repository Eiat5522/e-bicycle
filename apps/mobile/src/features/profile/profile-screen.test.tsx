import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useRouter } from "expo-router";

import { ProfileScreen } from "./profile-screen";
import { useAuth } from "../auth/auth-provider";

jest.mock("expo-router", () => ({
  useRouter: jest.fn()
}));

jest.mock("../auth/auth-provider", () => ({
  useAuth: jest.fn()
}));

describe("ProfileScreen", () => {
  const push = jest.fn();
  const signOut = jest.fn();
  const updateDisplayName = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(useAuth).mockReturnValue({
      profile: { firstName: "Alex" },
      signOut,
      updateDisplayName,
      user: { email: "alex@rideglide.app" }
    } as never);
  });

  it("renders Supabase-backed profile details and ride history", () => {
    render(<ProfileScreen />);

    const displayNameInput = screen.getByPlaceholderText("Enter your display name");

    expect(screen.getByText("Alex")).toBeTruthy();
    expect(screen.getByText("alex@rideglide.app")).toBeTruthy();
    expect(screen.getByDisplayValue("Alex")).toBeTruthy();
    expect(displayNameInput.props.editable).toBe(false);
    expect(screen.getByText("Edit")).toBeTruthy();
    expect(screen.queryByText("Save Display Name")).toBeNull();
    expect(screen.getByText("Ride history")).toBeTruthy();
    expect(
      screen.getByLabelText("Open ride details for อโศก Interchange to Benjakitti Park")
    ).toBeTruthy();
    expect(screen.getByText("Silom lunch loop")).toBeTruthy();
  });

  it("navigates to the ride detail screen when a ride card is pressed", () => {
    render(<ProfileScreen />);

    fireEvent.press(screen.getByLabelText("Open ride details for อโศก Interchange to Benjakitti Park"));

    expect(push).toHaveBeenCalledWith("../ride/history/ride-history-1");
  });

  it("signs out from the profile footer", () => {
    render(<ProfileScreen />);

    fireEvent.press(screen.getByText("Sign Out"));

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("updates the display name from the profile card", async () => {
    render(<ProfileScreen />);

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

  it("shows a validation error when the display name is empty", () => {
    render(<ProfileScreen />);

    fireEvent.press(screen.getByText("Edit"));
    fireEvent.changeText(screen.getByPlaceholderText("Enter your display name"), "   ");
    fireEvent.press(screen.getByText("Save Display Name"));

    expect(updateDisplayName).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a display name.")).toBeTruthy();
    expect(screen.getByPlaceholderText("Enter your display name").props.editable).toBe(true);
  });
});
