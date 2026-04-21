import { useRouter, useSegments } from "expo-router";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "./auth-provider";

export function AuthGate({ children }: { readonly children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { authStatus, session } = useAuth();

  useEffect(() => {
    if (authStatus === "loading") {
      return;
    }

    const rootSegment = segments[0];
    const inAuthGroup = rootSegment === "(auth)";
    const isCallbackRoute = inAuthGroup && segments[1] === "callback";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/welcome");
      return;
    }

    if (session && inAuthGroup && !isCallbackRoute) {
      router.replace("/(tabs)");
    }
  }, [authStatus, router, segments, session]);

  if (authStatus === "loading") {
    return null; // Or return a loading spinner
  }

  return <>{children}</>;
}
