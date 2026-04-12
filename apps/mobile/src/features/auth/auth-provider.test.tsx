import { act, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { AuthProvider, useAuth } from "./auth-provider";

const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignUp = jest.fn();
const mockSignOut = jest.fn();
const mockSetSession = jest.fn();
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockMaybeSingle = jest.fn();
const mockUpdate = jest.fn();
const mockUpdateEq = jest.fn();
const mockUpdateSelect = jest.fn();
const mockUpdateSingle = jest.fn();

let latestAuth: ReturnType<typeof useAuth> | undefined;

let authStateChangeCallback:
  | ((event: string, session: { user: { id: string; email: string } } | null) => void)
  | undefined;

jest.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      setSession: (...args: unknown[]) => mockSetSession(...args)
    },
    from: (...args: unknown[]) => mockFrom(...args)
  }
}));

jest.mock("expo-linking", () => ({
  addEventListener: jest.fn(() => ({
    remove: jest.fn()
  })),
  createURL: jest.fn(() => "exp://127.0.0.1:8081/--/callback"),
  getInitialURL: jest.fn(() => Promise.resolve(null))
}));

function AuthProbe() {
  latestAuth = useAuth();
  const { isLoading, profile, session, user } = latestAuth;

  return (
    <>
      <Text>{isLoading ? "loading" : "ready"}</Text>
      <Text>{session?.user.id ?? "no-session"}</Text>
      <Text>{user?.email ?? "no-email"}</Text>
      <Text>{profile?.firstName ?? "no-profile"}</Text>
    </>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    authStateChangeCallback = undefined;

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1",
            email: "alex@rideglide.app"
          }
        }
      }
    });

    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateChangeCallback = callback;

      return {
        data: {
          subscription: {
            unsubscribe: jest.fn()
          }
        }
      };
    });

    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "user-1",
        first_name: "Alex",
        created_at: "2026-04-11T00:00:00Z",
        updated_at: "2026-04-11T00:00:00Z"
      },
      error: null
    });

    mockEq.mockReturnValue({
      maybeSingle: mockMaybeSingle
    });

    mockUpdateSingle.mockResolvedValue({
      data: {
        id: "user-1",
        first_name: "Taylor",
        created_at: "2026-04-11T00:00:00Z",
        updated_at: "2026-04-11T01:00:00Z"
      },
      error: null
    });

    mockUpdateSelect.mockReturnValue({
      single: mockUpdateSingle
    });

    mockUpdateEq.mockReturnValue({
      select: mockUpdateSelect
    });

    mockUpdate.mockReturnValue({
      eq: mockUpdateEq
    });

    mockSelect.mockReturnValue({
      eq: mockEq
    });

    mockSetSession.mockResolvedValue({
      data: {
        session: null
      },
      error: null
    });

    mockFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate
    });
  });

  it("hydrates the existing session and profile on boot", async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("ready")).toBeTruthy();
    });

    expect(screen.getByText("user-1")).toBeTruthy();
    expect(screen.getByText("alex@rideglide.app")).toBeTruthy();
    expect(screen.getByText("Alex")).toBeTruthy();
    expect(mockFrom).toHaveBeenCalledWith("profiles");
  });

  it("clears session-derived state after a sign-out auth event", async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Alex")).toBeTruthy();
    });

    await act(async () => {
      authStateChangeCallback?.("SIGNED_OUT", null);
    });

    expect(screen.getByText("no-session")).toBeTruthy();
    expect(screen.getByText("no-email")).toBeTruthy();
    expect(screen.getByText("no-profile")).toBeTruthy();
  });

  it("updates the display name and refreshes the in-memory profile", async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Alex")).toBeTruthy();
    });

    await act(async () => {
      await latestAuth?.updateDisplayName("Taylor");
    });

    expect(mockFrom).toHaveBeenCalledWith("profiles");
    expect(mockUpdate).toHaveBeenCalledWith({ first_name: "Taylor" });
    expect(mockUpdateEq).toHaveBeenCalledWith("id", "user-1");
    expect(screen.getByText("Taylor")).toBeTruthy();
  });

  it("includes a native redirect URL when signing up", async () => {
    mockSignUp.mockResolvedValueOnce({ error: null });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("ready")).toBeTruthy();
    });

    await act(async () => {
      await latestAuth?.signUp("Alex", "Alex@RideGlide.App ", "secret-pass");
    });

    expect(mockSignUp).toHaveBeenCalledWith({
      email: "alex@rideglide.app",
      password: "secret-pass",
      options: {
        emailRedirectTo: "exp://127.0.0.1:8081/--/callback",
        data: {
          first_name: "Alex"
        }
      }
    });
  });
});
