import { PlatformColor, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { SymbolView } from "expo-symbols";

interface BatteryIndicatorProps {
  percent: number;
  delay?: number;
}

function getBatteryColor(percent: number): string {
  if (percent > 60) return "#30D158";
  if (percent > 20) return "#FF9F0A";
  return "#FF453A";
}

function getBatteryIcon(percent: number): string {
  if (percent > 75) return "battery.100";
  if (percent > 50) return "battery.75";
  if (percent > 25) return "battery.50";
  if (percent > 10) return "battery.25";
  return "battery.0";
}

export function BatteryIndicator({ percent, delay = 0 }: BatteryIndicatorProps) {
  const color = getBatteryColor(percent);
  const icon = getBatteryIcon(percent);

  return (
    <Animated.View entering={FadeInDown.duration(500).delay(delay).springify()}>
      <BlurView
        tint="systemMaterial"
        intensity={80}
        style={{
          borderRadius: 20,
          overflow: "hidden",
          padding: 20,
          borderCurve: "continuous",
          boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
          alignItems: "center",
          gap: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <SymbolView name={icon as any} size={28} tintColor={color} />
          <Text
            style={{
              fontSize: 48,
              fontWeight: "800",
              color,
              fontVariant: ["tabular-nums"],
            }}
          >
            {percent}%
          </Text>
        </View>
        <View
          style={{
            width: "100%",
            height: 8,
            backgroundColor: PlatformColor("systemFill") as unknown as string,
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: `${percent}%`,
              height: "100%",
              backgroundColor: color,
              borderRadius: 4,
            }}
          />
        </View>
        <Text
          style={{
            fontSize: 13,
            color: PlatformColor("secondaryLabel") as unknown as string,
            fontWeight: "500",
          }}
        >
          Battery Level
        </Text>
      </BlurView>
    </Animated.View>
  );
}
