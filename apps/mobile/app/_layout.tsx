import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthGate } from "@/features/auth/auth-gate";
import { AuthProvider, useAuth } from "@/features/auth/auth-provider";
import { RideSessionProvider } from "@/features/ride/ride-session-context";
import { colors, fontFamilies } from "@/theme/tokens";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold
  });
  const [fontLoadTimedOut, setFontLoadTimedOut] = useState(false);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
      return;
    }

    const timeoutId = setTimeout(() => {
      setFontLoadTimedOut(true);
    }, 4000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [fontError, fontsLoaded]);

  useEffect(() => {
    if (fontLoadTimedOut) {
      void SplashScreen.hideAsync();
    }
  }, [fontLoadTimedOut]);

  if (!fontsLoaded && !fontError && !fontLoadTimedOut) {
    return null;
  }

  // If fonts failed to load, continue with system fonts as fallback

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <AuthProvider>
        <RideSessionProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </RideSessionProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.background,
          flex: 1,
          gap: 16,
          justifyContent: "center",
          paddingHorizontal: 24
        }}>
        <ActivityIndicator color={colors.coralDark} size="large" />
        <Text
          selectable
          style={{
            color: colors.textMuted,
            fontFamily: fontFamilies.medium,
            fontSize: 16,
            textAlign: "center"
          }}>
          Restoring your rider session...
        </Text>
      </View>
    );
  }

  return (
    <AuthGate>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: {
            color: colors.text,
            fontFamily: fontFamilies.bold,
            fontSize: 18
          }
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
    </AuthGate>
  );
}
