import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";

import { SignupScreen } from "./signup-screen";
import { useAuth } from "./auth-provider";

jest.mock("expo-router", () => ({
  useRouter: jest.fn()
}));

jest.mock("./auth-provider", () => ({
  useAuth: jest.fn()
}));

describe("SignupScreen", () => {
  const push = jest.fn();
  const signUp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(useAuth).mockReturnValue({
      configError: null,
      signUp
    } as never);
  });

  it("submits first name, email, and password to Supabase auth", async () => {
    render(<SignupScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Enter your first name"), "Alex");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your email"), "Alex@RideGlide.App ");
    fireEvent.changeText(screen.getByPlaceholderText("Create a password"), "secret-pass");
    fireEvent.press(screen.getByText("Create Account"));

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith("Alex", "alex@rideglide.app", "secret-pass");
    });
  });

  it("surfaces sign-up errors inline", async () => {
    signUp.mockRejectedValueOnce(new Error("User already registered"));

    render(<SignupScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Enter your first name"), "Alex");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your email"), "alex@rideglide.app");
    fireEvent.changeText(screen.getByPlaceholderText("Create a password"), "secret-pass");
    fireEvent.press(screen.getByText("Create Account"));

    expect(await screen.findByText("User already registered")).toBeTruthy();
  });
});
