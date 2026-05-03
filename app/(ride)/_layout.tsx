import { Stack } from "expo-router/stack";
import { PlatformColor } from "react-native";

export default function RideLayout() {
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerBlurEffect: "systemMaterial",
        headerLargeTitle: false,
        headerShadowVisible: false,
        headerTitleStyle: { color: PlatformColor("label") as unknown as string },
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Ride" }} />
    </Stack>
  );
}
