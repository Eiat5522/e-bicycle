import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider } from "@/features/auth/auth-context";
import { colors } from "@/theme/tokens";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="bike/[id]" options={{ title: "Bike Details" }} />
          <Stack.Screen name="unlock/[id]" options={{ title: "Unlock Bike" }} />
          <Stack.Screen name="ride/active" options={{ title: "Active Ride" }} />
          <Stack.Screen
            name="ride/history/[id]"
            options={{ presentation: "modal", title: "Ride Details" }}
          />
          <Stack.Screen name="ride/summary" options={{ title: "Ride Summary" }} />
          <Stack.Screen name="help/index" options={{ title: "Support" }} />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
