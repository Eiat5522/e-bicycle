import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import type { Session, User } from "@supabase/supabase-js";

import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase.types";

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
}

const missingConfigMessage =
  "Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error && error.message.length > 0) {
    return error;
  }

  return new Error(fallbackMessage);
}

function mapProfileRow(row: {
  id: string;
  first_name: string;
  created_at: string;
  updated_at: string;
}): Profile {
  return {
    id: row.id,
    firstName: row.first_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function fetchProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, created_at, updated_at")
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
        const {
          data: { session: currentSession }
        } = await supabase.auth.getSession();
        const nextProfile = currentSession?.user ? await fetchProfile(currentSession.user.id) : null;

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

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function refreshProfile() {
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
  }

  async function signIn(email: string, password: string) {
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
  }

  async function signUp(firstName: string, email: string, password: string) {
    if (!hasSupabaseConfig) {
      throw new Error(missingConfigMessage);
    }

    const trimmedEmail = email.trim().toLowerCase();
    const normalizedFirstName = firstName.trim();

    const { error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          first_name: normalizedFirstName
        }
      }
    });

    if (error) {
      throw normalizeError(error, "Unable to create your account.");
    }
  }

  async function signOut() {
    if (!hasSupabaseConfig) {
      throw new Error(missingConfigMessage);
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      throw normalizeError(error, "Unable to sign out.");
    }
  }

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
      refreshProfile
    }),
    [isLoading, profile, session, user]
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
