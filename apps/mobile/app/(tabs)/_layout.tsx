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
          marginHorizontal: spacing.xxs,
          marginTop: spacing.xs,
          marginBottom: spacing.xxs
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderColor: colors.shadow,
          borderRadius: radii.large,
          borderWidth: borderWidths.thick,
          borderTopWidth: borderWidths.thick + 2,
          height: 64,
          marginBottom: spacing.xs,
          marginHorizontal: spacing.xs,
          paddingBottom: 6,
          paddingHorizontal: spacing.xxs,
          paddingTop: 4
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
