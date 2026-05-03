import { Stack } from "expo-router/stack";
import { PlatformColor } from "react-native";

export default function HistoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerBlurEffect: "systemMaterial",
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
        headerShadowVisible: false,
        headerLargeStyle: { backgroundColor: "transparent" },
        headerTitleStyle: { color: PlatformColor("label") as unknown as string },
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen name="index" options={{ title: "History" }} />
      <Stack.Screen name="[id]" options={{ title: "Ride Detail", headerLargeTitle: false }} />
    </Stack>
  );
}
