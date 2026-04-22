import { Stack } from "expo-router";

import { colors } from "@/theme/tokens";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        animation: "fade",
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text
      }}
    />
  );
}
