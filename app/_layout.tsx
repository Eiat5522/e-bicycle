import { NativeTabs, Icon, Label } from "expo-router/unstable-native-tabs";
import { useColorScheme } from "react-native";
import { ThemeProvider, DarkTheme, DefaultTheme } from "@react-navigation/native";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <NativeTabs minimizeBehavior="onScrollDown">
        <NativeTabs.Trigger name="(home)">
          <Icon sf={{ default: "house", selected: "house.fill" }} drawable="home" />
          <Label>Home</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(ride)">
          <Icon sf="bicycle" drawable="directions_bike" />
          <Label>Ride</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(history)">
          <Icon sf={{ default: "clock", selected: "clock.fill" }} drawable="history" />
          <Label>History</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="(settings)">
          <Icon sf="gear" drawable="settings" />
          <Label>Settings</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}
