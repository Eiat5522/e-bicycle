import { ScrollView, View, Text, PlatformColor, Switch, TextInput, Pressable } from "react-native";
import { useState } from "react";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { SymbolView } from "expo-symbols";
import Constants from "expo-constants";

interface SettingsRowProps {
  icon: string;
  iconColor: string;
  label: string;
  children?: React.ReactNode;
}

function SettingsRow({ icon, iconColor, label, children }: SettingsRowProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
        backgroundColor: PlatformColor("secondarySystemGroupedBackground") as unknown as string,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: iconColor,
          alignItems: "center",
          justifyContent: "center",
          borderCurve: "continuous",
        }}
      >
        <SymbolView name={icon as any} size={16} tintColor="#FFFFFF" />
      </View>
      <Text
        style={{
          flex: 1,
          fontSize: 16,
          color: PlatformColor("label") as unknown as string,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  delay?: number;
}

function SettingsSection({ title, children, delay = 0 }: SettingsSectionProps) {
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(delay).springify()} style={{ gap: 6 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: "500",
          color: PlatformColor("secondaryLabel") as unknown as string,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          paddingHorizontal: 4,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          borderRadius: 16,
          overflow: "hidden",
          borderCurve: "continuous",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        {children}
      </View>
    </Animated.View>
  );
}

export default function SettingsScreen() {
  const [bikeName, setBikeName] = useState("My E-Bicycle");
  const [batteryNotifs, setBatteryNotifs] = useState(true);
  const [rideNotifs, setRideNotifs] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  function toggleConnection() {
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsConnected((v) => !v);
  }

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 32 }}
    >
      <SettingsSection title="Bike" delay={0}>
        <SettingsRow icon="bicycle" iconColor="#0A84FF" label="Bike Name">
          <TextInput
            value={bikeName}
            onChangeText={setBikeName}
            style={{
              fontSize: 16,
              color: PlatformColor("secondaryLabel") as unknown as string,
              textAlign: "right",
              flex: 1,
            }}
            returnKeyType="done"
          />
        </SettingsRow>
        <View
          style={{
            height: 0.5,
            backgroundColor: PlatformColor("separator") as unknown as string,
            marginLeft: 60,
          }}
        />
        <Pressable onPress={toggleConnection}>
          <SettingsRow
            icon={isConnected ? "wifi" : "wifi.slash"}
            iconColor={isConnected ? "#30D158" : "#FF453A"}
            label={isConnected ? "Connected" : "Disconnected"}
          >
            <Text
              style={{
                fontSize: 14,
                color: isConnected
                  ? (PlatformColor("systemGreen") as unknown as string)
                  : (PlatformColor("systemRed") as unknown as string),
                fontWeight: "500",
              }}
            >
              {isConnected ? "Tap to disconnect" : "Tap to connect"}
            </Text>
          </SettingsRow>
        </Pressable>
      </SettingsSection>

      <SettingsSection title="Notifications" delay={100}>
        <SettingsRow icon="battery.25" iconColor="#FF9F0A" label="Low Battery Alert">
          <Switch
            value={batteryNotifs}
            onValueChange={setBatteryNotifs}
            trackColor={{ true: "#30D158" }}
          />
        </SettingsRow>
        <View
          style={{
            height: 0.5,
            backgroundColor: PlatformColor("separator") as unknown as string,
            marginLeft: 60,
          }}
        />
        <SettingsRow icon="flag.checkered" iconColor="#BF5AF2" label="Ride Summary">
          <Switch
            value={rideNotifs}
            onValueChange={setRideNotifs}
            trackColor={{ true: "#30D158" }}
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="About" delay={200}>
        <SettingsRow icon="info.circle" iconColor="#636366" label="Version">
          <Text
            style={{
              fontSize: 15,
              color: PlatformColor("secondaryLabel") as unknown as string,
            }}
            selectable
          >
            {appVersion}
          </Text>
        </SettingsRow>
        <View
          style={{
            height: 0.5,
            backgroundColor: PlatformColor("separator") as unknown as string,
            marginLeft: 60,
          }}
        />
        <SettingsRow icon="doc.text" iconColor="#636366" label="Licenses">
          <SymbolView
            name="chevron.right"
            size={14}
            tintColor={PlatformColor("tertiaryLabel") as unknown as string}
          />
        </SettingsRow>
      </SettingsSection>
    </ScrollView>
  );
}
