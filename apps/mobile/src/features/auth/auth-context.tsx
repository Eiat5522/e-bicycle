import type { Session, User } from "@supabase/supabase-js";
import { useRouter, useSegments } from "expo-router";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { AppState, Platform } from "react-native";

import { getSupabaseClient } from "@/lib/supabase";

interface AuthContextValue {
  readonly isLoading: boolean;
  readonly session: Session | null;
  readonly user: User | null;
  readonly signIn: (email: string, password: string) => Promise<void>;
  readonly signUp: (input: {
    readonly email: string;
    readonly firstName: string;
    readonly password: string;
  }) => Promise<void>;
  readonly signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
      })
      .finally(() => {
        setIsLoading(false);
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const subscription = AppState.addEventListener("change", (state) => {
      const supabase = getSupabaseClient();

      if (state === "active") {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      session,
      user: session?.user ?? null,
      async signIn(email, password) {
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          throw error;
        }
      },
      async signUp({ email, firstName, password }) {
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName
            }
          }
        });

        if (error) {
          throw error;
        }
      },
      async signOut() {
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.signOut();

        if (error) {
          throw error;
        }
      }
    }),
    [isLoading, session]
  );

  return (
    <AuthContext.Provider value={value}>
      <AuthRouteGuard />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return value;
}

function AuthRouteGuard() {
  const { isLoading, session } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const isAuthRoute = segments[0] === "(auth)";

    if (!session && !isAuthRoute) {
      router.replace("/(auth)/welcome");
      return;
    }

    if (session && isAuthRoute) {
      router.replace("/(tabs)");
    }
  }, [isLoading, router, segments, session]);

  return null;
}
