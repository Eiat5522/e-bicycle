import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import * as Linking from "expo-linking";
import { Platform } from "react-native";

import type { Session, User } from "@supabase/supabase-js";

import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import type { Database, Profile } from "@/lib/supabase.types";

interface AuthContextValue {
  readonly session: Session | null;
  readonly user: User | null;
  readonly profile: Profile | null;
  readonly isLoading: boolean;
  readonly configError: string | null;
  signIn(email: string, password: string): Promise<void>;
  signUp(firstName: string, email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<void>;
  updateDisplayName(displayName: string): Promise<void>;
}

const missingConfigMessage =
  "Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

const nativeEmailRedirectPath = "callback";
const bootstrapTimeoutMs = 5000;

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
    const queryParams = parsedUrl.searchParams;
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

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      if (!hasSupabaseConfig) {
        if (!isMounted) {
          return;
        }

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

          const nextProfile = currentSession?.user ? await fetchProfile(currentSession.user.id) : null;

          return {
            currentSession,
            nextProfile
          };
        };

        let bootstrapTimeoutId: ReturnType<typeof setTimeout> | undefined;

        const { currentSession, nextProfile } = await Promise.race([
          bootstrapSession(),
          new Promise<never>((_, reject) => {
            bootstrapTimeoutId = setTimeout(() => {
              reject(new Error("Auth bootstrap timed out."));
            }, bootstrapTimeoutMs);
          })
        ]).finally(() => {
          if (bootstrapTimeoutId) {
            clearTimeout(bootstrapTimeoutId);
          }
        });

        if (!isMounted) {
          return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setProfile(nextProfile);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.warn("Failed to bootstrap Supabase session", error);
        setSession(null);
        setUser(null);
        setProfile(null);
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
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setProfile(null);
        return;
      }

      void fetchProfile(nextSession.user.id)
        .then((nextProfile) => {
          if (isMounted) {
            setProfile(nextProfile);
          }
        })
        .catch((error) => {
          console.warn("Failed to refresh Supabase profile", error);

          if (isMounted) {
            setProfile(null);
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

  const signUp = useCallback(async (firstName: string, email: string, password: string) => {
    if (!hasSupabaseConfig) {
      throw new Error(missingConfigMessage);
    }

    const trimmedEmail = email.trim().toLowerCase();
    const normalizedFirstName = firstName.trim();
    const emailRedirectTo = getEmailRedirectUrl();

    const { error } = await supabase.auth.signUp({
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
  }, []);

  const signOut = useCallback(async () => {
    if (!hasSupabaseConfig) {
      throw new Error(missingConfigMessage);
    }

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
    [isLoading, profile, refreshProfile, session, signIn, signOut, signUp, updateDisplayName, user]
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
