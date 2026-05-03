import Animated, { FadeInDown } from "react-native-reanimated";
import { PlatformColor, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { SymbolView } from "expo-symbols";

interface StatCardProps {
  title: string;
  value: string;
  unit?: string;
  icon?: string;
  accentColor?: string;
  delay?: number;
}

export function StatCard({ title, value, unit, icon, accentColor, delay = 0 }: StatCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(delay).springify()}
      style={{ flex: 1 }}
    >
      <BlurView
        tint="systemMaterial"
        intensity={80}
        style={{
          borderRadius: 16,
          overflow: "hidden",
          padding: 16,
          borderCurve: "continuous",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
          {icon && (
            <SymbolView
              name={icon as any}
              size={14}
              tintColor={accentColor ?? (PlatformColor("secondaryLabel") as unknown as string)}
            />
          )}
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: PlatformColor("secondaryLabel") as unknown as string,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {title}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: PlatformColor("label") as unknown as string,
              fontVariant: ["tabular-nums"],
            }}
          >
            {value}
          </Text>
          {unit && (
            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: PlatformColor("secondaryLabel") as unknown as string,
              }}
            >
              {unit}
            </Text>
          )}
        </View>
      </BlurView>
    </Animated.View>
  );
}
