import { fireEvent, render, screen } from "@testing-library/react-native";
import { useRouter } from "expo-router";

import { mockUser } from "@glide/api";

import { ProfileScreen } from "./profile-screen";

jest.mock("@/features/auth/auth-context", () => ({
  useAuth: jest.fn(() => ({
    signOut: jest.fn()
  }))
}));

jest.mock("@/lib/user-service", () => ({
  configuredUserService: {
    getCurrentUser: jest.fn(async () => mockUser)
  }
}));

jest.mock("expo-router", () => ({
  useRouter: jest.fn()
}));

describe("ProfileScreen", () => {
  const push = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
  });

  it("renders ride history cards for completed rides", () => {
    render(<ProfileScreen />);

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
});
