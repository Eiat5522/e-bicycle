import { useRouter, useSegments } from "expo-router";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "./auth-provider";

export function AuthGate({ children }: { readonly children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { isLoading, session } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const rootSegment = segments[0];
    const inAuthGroup = rootSegment === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/welcome");
      return;
    }

    if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [isLoading, router, segments, session]);

  if (isLoading) {
    return null; // Or return a loading spinner
  }

  return <>{children}</>;
}
