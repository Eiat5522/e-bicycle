import { fireEvent, render, screen } from "@testing-library/react-native";
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

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(useAuth).mockReturnValue({
      profile: { firstName: "Alex" },
      signOut,
      user: { email: "alex@rideglide.app" }
    } as never);
  });

  it("renders Supabase-backed profile details and ride history", () => {
    render(<ProfileScreen />);

    expect(screen.getByText("Alex")).toBeTruthy();
    expect(screen.getByText("alex@rideglide.app")).toBeTruthy();
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
});
