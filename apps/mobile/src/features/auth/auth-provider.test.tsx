import { act, render, screen, waitFor } from "@testing-library/react-native";
import { Platform, Text } from "react-native";

import { AuthProvider, useAuth } from "./auth-provider";

jest.mock("react", () => jest.requireActual("react"));

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
const mockLinkingAddEventListener = jest.fn();
const mockLinkingGetInitialURL = jest.fn();
const mockLinkingCreateURL = jest.fn();
const mockRemoveUrlListener = jest.fn();

let latestAuth: ReturnType<typeof useAuth> | undefined;

let authStateChangeCallback:
  | ((event: string, session: { user: { id: string; email: string } } | null) => void)
  | undefined;
let urlEventCallback: ((event: { url: string }) => void) | undefined;

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
  addEventListener: (...args: unknown[]) => mockLinkingAddEventListener(...args),
  createURL: (...args: unknown[]) => mockLinkingCreateURL(...args),
  getInitialURL: (...args: unknown[]) => mockLinkingGetInitialURL(...args)
}));

function AuthProbe() {
  latestAuth = useAuth();
  const { authStatus, isLoading, profile, session, user } = latestAuth;

  return (
    <>
      <Text>{isLoading ? "loading" : "ready"}</Text>
      <Text>{authStatus}</Text>
      <Text>{session?.user.id ?? "no-session"}</Text>
      <Text>{user?.email ?? "no-email"}</Text>
      <Text>{profile?.firstName ?? "no-profile"}</Text>
    </>
  );
}

describe("AuthProvider", () => {
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    authStateChangeCallback = undefined;
    urlEventCallback = undefined;

    mockLinkingAddEventListener.mockImplementation((_type, callback) => {
      urlEventCallback = callback as (event: { url: string }) => void;

      return {
        remove: mockRemoveUrlListener
      };
    });
    mockLinkingCreateURL.mockReturnValue("exp://127.0.0.1:8081/--/callback");
    mockLinkingGetInitialURL.mockResolvedValue(null);

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
            unsubscribe: mockUnsubscribe
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
    mockSignOut.mockResolvedValue({ error: null });

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
    mockSignUp.mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: "user-1",
            email: "alex@rideglide.app"
          }
        }
      },
      error: null
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("ready")).toBeTruthy();
    });

    await act(async () => {
      await expect(
        latestAuth?.signUp("Alex", "Alex@RideGlide.App ", "secret-pass")
      ).resolves.toEqual({
        status: "signed_in"
      });
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

  it("throws when useAuth is called outside the provider", () => {
    function BrokenConsumer() {
      useAuth();
      return <Text>broken</Text>;
    }

    expect(() => render(<BrokenConsumer />)).toThrow("useAuth must be used within an AuthProvider.");
  });

  it("signs in with trimmed lowercase email", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("ready")).toBeTruthy();
    });

    await act(async () => {
      await latestAuth?.signIn(" Alex@RideGlide.App ", "secret-pass");
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "alex@rideglide.app",
      password: "secret-pass"
    });
  });

  it("surfaces normalized auth operation errors", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: "bad credentials" });
    mockSignOut.mockResolvedValueOnce({ error: "bad signout" });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("ready")).toBeTruthy();
    });

    await expect(latestAuth?.signIn("alex@rideglide.app", "wrong-pass")).rejects.toThrow("Unable to sign in.");

    await act(async () => {
      await expect(latestAuth?.signOut()).rejects.toThrow("Unable to sign out.");
    });
  });

  it("signs out and clears auth state when auth-state profile refresh fails", async () => {
    mockMaybeSingle
      .mockResolvedValueOnce({
        data: {
          id: "user-1",
          first_name: "Alex",
          created_at: "2026-04-11T00:00:00Z",
          updated_at: "2026-04-11T00:00:00Z"
        },
        error: null
      })
      .mockResolvedValueOnce({
        data: {
          id: "user-1",
          first_name: "Jordan",
          created_at: "2026-04-11T00:00:00Z",
          updated_at: "2026-04-11T02:00:00Z"
        },
        error: null
      })
      .mockResolvedValueOnce({
        data: null,
        error: new Error("profile fetch failed")
      });

    const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Alex")).toBeTruthy();
    });

    await act(async () => {
      await latestAuth?.refreshProfile();
    });

    expect(screen.getByText("Jordan")).toBeTruthy();

    await act(async () => {
      authStateChangeCallback?.("SIGNED_IN", {
        user: {
          id: "user-1",
          email: "alex@rideglide.app"
        }
      });
    });

    await waitFor(() => {
      expect(latestAuth?.authStatus).toBe("unauthenticated");
    });

    expect(latestAuth?.session).toBeNull();
    expect(latestAuth?.user).toBeNull();
    expect(latestAuth?.profile).toBeNull();
    expect(latestAuth?.authError).toBe("profile fetch failed");
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalledWith("Failed to refresh Supabase profile", expect.any(Error));
    consoleWarn.mockRestore();
  });

  it("validates display-name updates and refresh without a signed-in user", async () => {
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

    await expect(latestAuth?.updateDisplayName("")).rejects.toThrow("You need to sign in before updating your display name.");

    await act(async () => {
      await latestAuth?.refreshProfile();
    });

    expect(screen.getByText("no-profile")).toBeTruthy();
  });

  it("validates blank display names for a signed-in user", async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Alex")).toBeTruthy();
    });

    await expect(latestAuth?.updateDisplayName("   ")).rejects.toThrow("Enter a display name.");
  });

  it("reports when sign up requires email confirmation", async () => {
    mockSignUp.mockResolvedValueOnce({
      data: {
        session: null
      },
      error: null
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("ready")).toBeTruthy();
    });

    await act(async () => {
      await expect(latestAuth?.signUp("Alex", "alex@rideglide.app", "secret-pass")).resolves.toEqual(
        {
          status: "awaiting_email_confirmation"
        }
      );
    });

    expect(screen.getByText("awaiting_email_confirmation")).toBeTruthy();
  });

  it("restores a session from the initial deep link and runtime URL events", async () => {
    const previousPlatform = Platform.OS;
    jest.replaceProperty(Platform, "OS", "ios");
    try {
      mockGetSession
        .mockResolvedValueOnce({
          data: {
            session: null
          }
        })
        .mockResolvedValueOnce({
          data: {
            session: {
              user: {
                id: "user-1",
                email: "alex@rideglide.app"
              }
            }
          }
        });
      mockLinkingGetInitialURL.mockResolvedValueOnce(
        "glide://callback#access_token=access-token&refresh_token=refresh-token"
      );
      mockSetSession.mockResolvedValue({ data: { session: null }, error: null });

      render(
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("ready")).toBeTruthy();
      });

      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: "access-token",
        refresh_token: "refresh-token"
      });

      await act(async () => {
        urlEventCallback?.({
          url: "glide://callback?access_token=live-access&refresh_token=live-refresh"
        });
      });

      await waitFor(() => {
        expect(mockSetSession).toHaveBeenCalledWith({
          access_token: "live-access",
          refresh_token: "live-refresh"
        });
      });
    } finally {
      jest.replaceProperty(Platform, "OS", previousPlatform);
    }
  });

  it("restores a session when the URL implementation does not expose searchParams", async () => {
    const previousPlatform = Platform.OS;
    const originalUrl = globalThis.URL;

    class UrlWithoutSearchParams {
      readonly hash = "";
      readonly search = "?access_token=query-access&refresh_token=query-refresh";

      constructor(_url: string) {}
    }

    jest.replaceProperty(Platform, "OS", "ios");
    globalThis.URL = UrlWithoutSearchParams as unknown as typeof URL;

    try {
      mockGetSession
        .mockResolvedValueOnce({
          data: {
            session: null
          }
        })
        .mockResolvedValueOnce({
          data: {
            session: {
              user: {
                id: "user-1",
                email: "alex@rideglide.app"
              }
            }
          }
        });
      mockLinkingGetInitialURL.mockResolvedValueOnce(
        "glide://callback?access_token=query-access&refresh_token=query-refresh"
      );

      render(
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("ready")).toBeTruthy();
      });

      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: "query-access",
        refresh_token: "query-refresh"
      });
    } finally {
      globalThis.URL = originalUrl;
      jest.replaceProperty(Platform, "OS", previousPlatform);
    }
  });

  it("warns when a deep link cannot be parsed", async () => {
    const previousPlatform = Platform.OS;
    jest.replaceProperty(Platform, "OS", "ios");
    const consoleWarn = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("ready")).toBeTruthy();
    });

    await act(async () => {
      urlEventCallback?.({
        url: "not-a-valid-url"
      });
    });

    await waitFor(() => {
      expect(consoleWarn).toHaveBeenCalledWith(
        "Failed to parse auth redirect URL",
        expect.anything()
      );
    });

    consoleWarn.mockRestore();
    jest.replaceProperty(Platform, "OS", previousPlatform);
  });

  it("unsubscribes auth and deep-link listeners on unmount", async () => {
    const previousPlatform = Platform.OS;
    jest.replaceProperty(Platform, "OS", "ios");

    const view = render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("ready")).toBeTruthy();
    });

    view.unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(mockRemoveUrlListener).toHaveBeenCalledTimes(1);
    jest.replaceProperty(Platform, "OS", previousPlatform);
  });
});
