import { Redirect } from "expo-router";

import { useAuth } from "@/features/auth/auth-provider";

export default function IndexRoute() {
  const { authStatus, isLoading, session } = useAuth();

  if (isLoading || authStatus === "loading") {
    return null;
  }

  return <Redirect href={session ? "/(tabs)" : "/(auth)/welcome"} />;
}
