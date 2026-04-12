import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

import { borderWidths, colors, fontFamilies, radii, spacing } from "@/theme/tokens";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: {
          color: colors.text,
          fontFamily: fontFamilies.bold,
          fontSize: 18
        },
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.coralDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarActiveBackgroundColor: colors.yellow,
        tabBarInactiveBackgroundColor: colors.surface,
        tabBarIconStyle: {
          marginBottom: 0
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: fontFamilies.bold
        },
        tabBarItemStyle: {
          borderRadius: radii.medium,
          marginHorizontal: 3,
          marginVertical: 3
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderColor: colors.shadow,
          borderRadius: radii.large,
          borderWidth: borderWidths.thick + 1,
          height: 72,
          marginBottom: spacing.xs,
          marginHorizontal: spacing.xs,
          paddingBottom: 8,
          paddingTop: 6
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: "Map",
          tabBarLabel: "Map",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="map-search-outline" size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: "Wallet",
          tabBarLabel: "Wallet",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="wallet-outline" size={size} />
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="account-outline" size={size} />
          )
        }}
      />
    </Tabs>
  );
}
