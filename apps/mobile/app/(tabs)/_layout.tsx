import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SCAN_TAB_UNLOCK_HREF } from "@/navigation/scan-tab";
import { getTabBarStyle } from "@/navigation/tab-bar-style";
import { colors, fontFamilies, radii } from "@/theme/tokens";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
          fontSize: 9,
          fontFamily: fontFamilies.bold
        },
        tabBarItemStyle: {
          borderRadius: radii.medium,
          marginHorizontal: 2,
          marginTop: 2,
          marginBottom: 0
        },
        tabBarStyle: getTabBarStyle(insets.bottom)
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
        name="scan"
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.push(SCAN_TAB_UNLOCK_HREF);
          }
        }}
        options={{
          headerShown: false,
          title: "Scan",
          tabBarLabel: "Scan",
          tabBarIcon: () => (
            <View
              style={{
                alignItems: "center",
                backgroundColor: colors.teal,
                borderColor: colors.shadow,
                borderRadius: radii.pill,
                borderWidth: 3,
                height: 36,
                justifyContent: "center",
                marginTop: -4,
                width: 36
              }}>
              <MaterialCommunityIcons color={colors.surface} name="qrcode-scan" size={18} />
            </View>
          )
        }}
      />
      <Tabs.Screen
        name="chat-support"
        options={{
          title: "Chat Support",
          tabBarLabel: "Support",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons color={color} name="message-text-outline" size={size} />
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
