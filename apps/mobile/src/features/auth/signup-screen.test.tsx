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
    signUp.mockResolvedValue({ status: "signed_in" });
    jest.mocked(useAuth).mockReturnValue({
      authError: null,
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

  it("validates missing fields before submitting", async () => {
    render(<SignupScreen />);

    fireEvent.press(screen.getByText("Create Account"));

    expect(signUp).not.toHaveBeenCalled();
    expect(await screen.findByText("Enter your first name, email, and password.")).toBeTruthy();
  });

  it("shows the config error and routes back to login", () => {
    jest.mocked(useAuth).mockReturnValue({
      authError: null,
      configError: "Supabase is not configured.",
      signUp
    } as never);

    render(<SignupScreen />);

    expect(screen.getByText("Supabase is not configured.")).toBeTruthy();

    fireEvent.press(screen.getByText("Back to Login"));

    expect(push).toHaveBeenCalledWith("/(auth)/login");
  });

  it("shows confirmation guidance when sign up requires email verification", async () => {
    signUp.mockResolvedValueOnce({ status: "awaiting_email_confirmation" });

    render(<SignupScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Enter your first name"), "Alex");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your email"), "alex@rideglide.app");
    fireEvent.changeText(screen.getByPlaceholderText("Create a password"), "secret-pass");
    fireEvent.press(screen.getByText("Create Account"));

    expect(
      await screen.findByText(
        "Check your email to confirm your account, then return to the app to finish signing in."
      )
    ).toBeTruthy();
  });
});
