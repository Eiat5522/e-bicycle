import { Redirect } from "expo-router";

import { useAuth } from "@/features/auth/auth-provider";

export default function IndexRoute() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return null;
  }

  return <Redirect href={session ? "/(tabs)" : "/(auth)/welcome"} />;
}
