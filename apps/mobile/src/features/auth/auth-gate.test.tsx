import { render, waitFor } from "@testing-library/react-native";
import { useRouter, useSegments } from "expo-router";
import { Text } from "react-native";

import { AuthGate } from "./auth-gate";
import { useAuth } from "./auth-provider";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  useSegments: jest.fn()
}));

jest.mock("./auth-provider", () => ({
  useAuth: jest.fn()
}));

describe("AuthGate", () => {
  const replace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
  });

  it("redirects signed-out users away from protected routes", async () => {
    jest.mocked(useSegments).mockReturnValue(["(tabs)", "index"] as never);
    jest.mocked(useAuth).mockReturnValue({
      isLoading: false,
      session: null
    } as never);

    render(
      <AuthGate>
        <Text>child</Text>
      </AuthGate>
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/(auth)/welcome");
    });
  });

  it("redirects signed-in users out of auth routes", async () => {
    jest.mocked(useSegments).mockReturnValue(["(auth)", "login"] as never);
    jest.mocked(useAuth).mockReturnValue({
      isLoading: false,
      session: { user: { id: "user-1" } }
    } as never);

    render(
      <AuthGate>
        <Text>child</Text>
      </AuthGate>
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("leaves authenticated non-auth routes alone", async () => {
    jest.mocked(useSegments).mockReturnValue(["(tabs)", "index"] as never);
    jest.mocked(useAuth).mockReturnValue({
      isLoading: false,
      session: { user: { id: "user-1" } }
    } as never);

    render(
      <AuthGate>
        <Text>child</Text>
      </AuthGate>
    );

    await waitFor(() => {
      expect(replace).not.toHaveBeenCalled();
    });
  });
});
