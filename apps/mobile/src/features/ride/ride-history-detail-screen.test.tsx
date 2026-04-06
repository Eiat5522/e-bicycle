import { fireEvent, render, screen } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text as MockText } from "react-native";

import { RideHistoryDetailScreen } from "./ride-history-detail-screen";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn()
}));

jest.mock("./ride-replay-map", () => ({
  RideReplayMap: jest.fn(({ ride }) => <MockText>Replay map for {ride.routeLabel}</MockText>)
}));

describe("RideHistoryDetailScreen", () => {
  const replace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
  });

  it("renders the selected ride details", () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: "ride-history-1" });

    render(<RideHistoryDetailScreen />);

    expect(screen.getByText("Ride Details")).toBeTruthy();
    expect(screen.getAllByText("อโศก Interchange to Benjakitti Park").length).toBeGreaterThan(0);
    expect(screen.getByText("Charged to Visa **** 4242")).toBeTruthy();
    expect(screen.getByText("Replay map for อโศก Interchange to Benjakitti Park")).toBeTruthy();
    expect(screen.getByText("Route details")).toBeTruthy();
  });

  it("routes back to profile when the ride is missing", () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: "missing-ride" });

    render(<RideHistoryDetailScreen />);

    fireEvent.press(screen.getByText("Back to Profile"));

    expect(replace).toHaveBeenCalledWith("/(tabs)/profile");
  });
});
