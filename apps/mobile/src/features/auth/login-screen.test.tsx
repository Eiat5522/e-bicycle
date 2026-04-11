import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";

import { LoginScreen } from "./login-screen";
import { useAuth } from "./auth-provider";

jest.mock("expo-router", () => ({
  useRouter: jest.fn()
}));

jest.mock("./auth-provider", () => ({
  useAuth: jest.fn()
}));

describe("LoginScreen", () => {
  const push = jest.fn();
  const signIn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(useAuth).mockReturnValue({
      configError: null,
      signIn
    } as never);
  });

  it("submits email/password to Supabase auth", async () => {
    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Enter your email"), "Alex@RideGlide.App ");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "secret-pass");
    fireEvent.press(screen.getByText("Sign In"));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("alex@rideglide.app", "secret-pass");
    });
  });

  it("surfaces sign-in errors inline", async () => {
    signIn.mockRejectedValueOnce(new Error("Invalid login credentials"));

    render(<LoginScreen />);

    fireEvent.changeText(screen.getByPlaceholderText("Enter your email"), "alex@rideglide.app");
    fireEvent.changeText(screen.getByPlaceholderText("Enter your password"), "wrong-pass");
    fireEvent.press(screen.getByText("Sign In"));

    expect(await screen.findByText("Invalid login credentials")).toBeTruthy();
  });
});
