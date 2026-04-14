import { fireEvent, render, screen } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ActiveRideScreen } from "./active-ride-screen";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn()
}));

describe("ActiveRideScreen", () => {
  const push = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
  });

  it("renders the unlock arrival overlay when entering from the unlock flow", () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({
      bikeId: "G-205",
      entry: "unlock"
    });

    render(<ActiveRideScreen />);

    expect(screen.getByText("Bike unlocked")).toBeTruthy();
    expect(screen.getByText("G-205 is unlocked and moving")).toBeTruthy();
    expect(screen.getByText("Ride live now")).toBeTruthy();
  });

  it("navigates to the ride summary when ending the ride", () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({});

    render(<ActiveRideScreen />);

    expect(screen.queryByText("Bike unlocked")).toBeNull();
    expect(screen.getByText("Ride corridor")).toBeTruthy();
    expect(screen.getByText(/Current cost:/)).toBeTruthy();
    expect(screen.getByText(/Session ID:/)).toBeTruthy();

    fireEvent.press(screen.getByText("End Ride"));

    expect(push).toHaveBeenCalledWith("/ride/summary");
  });
});
