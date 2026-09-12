import * as Linking from "expo-linking";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode
} from "react";
import { Platform } from "react-native";

import type { Session, User } from "@supabase/supabase-js";

import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import type { Database } from "@/lib/supabase.types";

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "unauthenticated"
  | "awaiting_email_confirmation";

export interface SignUpResult {
  readonly status: "signed_in" | "awaiting_email_confirmation";
}

interface Profile {
  readonly createdAt: string;
  readonly firstName: string | null;
  readonly id: string;
  readonly updatedAt: string;
}

interface AuthContextValue {
  readonly authError: string | null;
  readonly authStatus: AuthStatus;
  readonly session: Session | null;
  readonly user: User | null;
  readonly profile: Profile | null;
  readonly isLoading: boolean;
  readonly configError: string | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(firstName: string, email: string, password: string): Promise<SignUpResult>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<void>;
  updateDisplayName(displayName: string): Promise<void>;
}

const missingConfigMessage =
  "Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
type ProfileRow = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "first_name" | "created_at" | "updated_at"
>;

const nativeEmailRedirectPath = "callback";
const bootstrapTimeoutMs = 5000;
const profileRetryDelayMs = 250;
const profileRetryLimit = 8;

class MissingProfileError extends Error {
  constructor() {
    super("We couldn't finish preparing your rider profile. Please sign in again.");
  }
}

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.length > 0) {
    return error;
  }

  return new Error(fallbackMessage);
}

function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    firstName: row.first_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getEmailRedirectUrl() {
  if (Platform.OS === "web") {
    return undefined;
  }

  return Linking.createURL(nativeEmailRedirectPath);
}

function getSessionTokensFromUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const hashParams = new URLSearchParams(parsedUrl.hash.startsWith("#") ? parsedUrl.hash.slice(1) : "");
    const queryParams = new URLSearchParams(
      parsedUrl.search.startsWith("?") ? parsedUrl.search.slice(1) : parsedUrl.search
    );
    const accessToken = hashParams.get("access_token") ?? queryParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token") ?? queryParams.get("refresh_token");

    if (!accessToken || !refreshToken) {
      return null;
    }

    return {
      accessToken,
      refreshToken
    };
  } catch (error) {
    console.warn("Failed to parse auth redirect URL", error);
    return null;
  }
}

async function restoreSessionFromUrl(url: string) {
  const tokens = getSessionTokensFromUrl(url);

  if (!tokens) {
    return false;
  }

  const { error } = await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken
  });

  if (error) {
    throw error;
  }

  return true;
}

async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, is_admin, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapProfileRow(data) : null;
}

async function waitForProfile(userId: string) {
  for (let attempt = 0; attempt <= profileRetryLimit; attempt += 1) {
    const profile = await fetchProfile(userId);

    if (profile) {
      return profile;
    }

    if (attempt === profileRetryLimit) {
      break;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, profileRetryDelayMs);
    });
  }

  throw new MissingProfileError();
}

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [authError, setAuthError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authStateGenerationRef = useRef(0);
  const profileRequestIdRef = useRef(0);

  useEffect(() => {
    let isMounted = true;
    const bootstrapGeneration = authStateGenerationRef.current + 1;
    authStateGenerationRef.current = bootstrapGeneration;

    async function bootstrap() {
      if (!hasSupabaseConfig) {
        if (!isMounted || authStateGenerationRef.current !== bootstrapGeneration) {
          return;
        }

        setAuthError(null);
        setAuthStatus("unauthenticated");
        setIsLoading(false);
        return;
      }

      try {
        const bootstrapSession = async () => {
          let {
            data: { session: currentSession }
          } = await supabase.auth.getSession();

          if (Platform.OS !== "web" && !currentSession) {
            const initialUrl = await Linking.getInitialURL();

            if (initialUrl) {
              await restoreSessionFromUrl(initialUrl);

              const {
                data: { session: restoredSession }
              } = await supabase.auth.getSession();

              currentSession = restoredSession;
            }
          }

          let nextProfile: Profile | null = null;

          if (currentSession?.user) {
            try {
              nextProfile = await waitForProfile(currentSession.user.id);
            } catch (error) {
              if (error instanceof MissingProfileError) {
                if (authStateGenerationRef.current !== bootstrapGeneration) {
                  return { currentSession, nextProfile: null };
                }

                const { error: signOutError } = await supabase.auth.signOut();

                if (signOutError) {
                  console.warn("Failed to clear an incomplete Supabase session", signOutError);
                }

                throw error;
              }

              console.warn("Failed to reconcile Supabase profile during bootstrap", error);
            }
          }

          return { currentSession, nextProfile };
        };

        interface BootstrapResult {
          readonly currentSession: Session | null;
          readonly nextProfile: Profile | null;
        }

        let bootstrapTimeoutId: ReturnType<typeof setTimeout> | undefined;

        const settled = (await Promise.race([
          bootstrapSession() as Promise<BootstrapResult>,
          new Promise<BootstrapResult>((_, reject) => {
            bootstrapTimeoutId = setTimeout(() => {
              reject(new Error("Auth bootstrap timed out."));
            }, bootstrapTimeoutMs);
          })
        ]).finally(() => {
          if (bootstrapTimeoutId) {
            clearTimeout(bootstrapTimeoutId);
          }
        })) as BootstrapResult;

        const { currentSession, nextProfile } = settled;

        if (
          !isMounted ||
          authStateGenerationRef.current !== bootstrapGeneration
        ) {
          return;
        }

        setAuthError(null);
        setSession(currentSession ?? null);
        setUser(currentSession?.user ?? null);
        setProfile(nextProfile);
        setAuthStatus(currentSession?.user ? "authenticated" : "unauthenticated");
      } catch (error) {
        if (!isMounted || authStateGenerationRef.current !== bootstrapGeneration) {
          return;
        }

        console.warn("Failed to bootstrap Supabase session", error);
        setSession(null);
        setUser(null);
        setProfile(null);
        setAuthError(error instanceof Error ? error.message : "Unable to restore your rider session.");
        setAuthStatus("unauthenticated");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authStateGenerationRef.current += 1;

      if (nextSession?.user) {
        setAuthError(null);
      }

      setAuthStatus(nextSession?.user ? "loading" : "unauthenticated");
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        profileRequestIdRef.current += 1;
        setProfile(null);
        return;
      }

      const profileRequestId = profileRequestIdRef.current + 1;
      profileRequestIdRef.current = profileRequestId;

      void waitForProfile(nextSession.user.id)
        .then((nextProfile) => {
          if (isMounted && profileRequestIdRef.current === profileRequestId) {
            setProfile(nextProfile);
            setAuthStatus("authenticated");
          }
        })
        .catch((error) => {
          console.warn("Failed to refresh Supabase profile", error);

          if (isMounted && profileRequestIdRef.current === profileRequestId) {
            const nextError =
              error instanceof Error ? error.message : "Unable to refresh your rider profile.";

            setSession(null);
            setUser(null);
            setProfile(null);
            setAuthError(nextError);
            setAuthStatus("unauthenticated");
            void supabase.auth.signOut().catch((signOutError) => {
              console.warn("Failed to sign out after profile reconciliation error", signOutError);
            });
          }
        });
    });

    const nativeLinkSubscription =
      Platform.OS === "web"
        ? null
        : Linking.addEventListener("url", ({ url }) => {
            void restoreSessionFromUrl(url).catch((error) => {
              console.warn("Failed to restore Supabase session from deep link", error);
            });
          });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      nativeLinkSubscription?.remove();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!hasSupabaseConfig) {
      throw new Error(missingConfigMessage);
    }

    if (!user) {
      setProfile(null);
      return;
    }

    try {
      setProfile(await fetchProfile(user.id));
    } catch (error) {
      throw normalizeError(error, "Unable to refresh profile.");
    }
  }, [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!hasSupabaseConfig) {
      throw new Error(missingConfigMessage);
    }

    const trimmedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password
    });

    if (error) {
      throw normalizeError(error, "Unable to sign in.");
    }
  }, []);

  const signUp = useCallback(
    async (firstName: string, email: string, password: string) => {
      if (!hasSupabaseConfig) {
        throw new Error(missingConfigMessage);
      }

      const trimmedEmail = email.trim().toLowerCase();
      const normalizedFirstName = firstName.trim();
      const emailRedirectTo = getEmailRedirectUrl();

      setAuthError(null);

      const {
        data: { session: nextSession },
        error
      } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          ...(emailRedirectTo ? { emailRedirectTo } : {}),
          data: {
            first_name: normalizedFirstName
          }
        }
      });

      if (error) {
        throw normalizeError(error, "Unable to create your account.");
      }

      if (!nextSession) {
        setAuthStatus("awaiting_email_confirmation");

        return {
          status: "awaiting_email_confirmation"
        } satisfies SignUpResult;
      }

      return {
        status: "signed_in"
      } satisfies SignUpResult;
    },
    []
  );

  const signOut = useCallback(async () => {
    if (!hasSupabaseConfig) {
      throw new Error(missingConfigMessage);
    }

    setAuthError(null);
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw normalizeError(error, "Unable to sign out.");
    }
  }, []);

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      if (!hasSupabaseConfig) {
        throw new Error(missingConfigMessage);
      }

      if (!user) {
        throw new Error("You need to sign in before updating your display name.");
      }

      const normalizedDisplayName = displayName.trim();

      if (!normalizedDisplayName) {
        throw new Error("Enter a display name.");
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({ first_name: normalizedDisplayName })
        .eq("id", user.id)
        .select("id, first_name, is_admin, created_at, updated_at")
        .single();

      if (error) {
        throw normalizeError(error, "Unable to update your display name.");
      }

      setProfile(mapProfileRow(data));
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      authError,
      authStatus,
      session,
      user,
      profile,
      isLoading,
      configError: hasSupabaseConfig ? null : missingConfigMessage,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateDisplayName
    }),
    [
      authError,
      authStatus,
      isLoading,
      profile,
      refreshProfile,
      session,
      signIn,
      signOut,
      signUp,
      updateDisplayName,
      user
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
