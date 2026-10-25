import { Stack } from "expo-router";

import { SignupScreen } from "@/features/auth/signup-screen";

export default function SignupRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "Create Account" }} />
      <SignupScreen />
    </>
  );
}
