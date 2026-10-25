import { Stack } from "expo-router";

import { WelcomeScreen } from "@/features/auth/welcome-screen";

export default function WelcomeRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WelcomeScreen />
    </>
  );
}
