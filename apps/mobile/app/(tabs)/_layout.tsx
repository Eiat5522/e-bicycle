import { Tabs } from "expo-router";

import { colors, radii } from "@/theme/tokens";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.coralDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600"
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: radii.large,
          borderTopRightRadius: radii.large,
          borderTopWidth: 0,
          height: 72,
          paddingBottom: 12,
          paddingTop: 12
        }
      }}>
      <Tabs.Screen name="index" options={{ title: "Map", tabBarLabel: "Map" }} />
      <Tabs.Screen name="wallet" options={{ title: "Wallet", tabBarLabel: "Wallet" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarLabel: "Profile" }} />
    </Tabs>
  );
}
