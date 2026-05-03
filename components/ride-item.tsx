import { Link } from "expo-router";
import { Pressable, Text, View, PlatformColor } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SymbolView } from "expo-symbols";
import { Ride, formatDate, formatDuration } from "@/utils/mock-data";

interface RideItemProps {
  ride: Ride;
  index: number;
}

export function RideItem({ ride, index }: RideItemProps) {
  return (
    <Animated.View entering={FadeInDown.duration(350).delay(index * 60).springify()}>
      <Link href={`/(history)/${ride.id}`} asChild>
        <Pressable
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: PlatformColor("secondarySystemGroupedBackground") as unknown as string,
          })}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: PlatformColor("systemBlue") as unknown as string,
              alignItems: "center",
              justifyContent: "center",
              borderCurve: "continuous",
            }}
          >
            <SymbolView name="bicycle" size={20} tintColor="#FFFFFF" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: PlatformColor("label") as unknown as string,
              }}
            >
              {ride.name}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: PlatformColor("secondaryLabel") as unknown as string,
              }}
            >
              {formatDate(ride.date)} · {ride.distance.toFixed(1)} km · {formatDuration(ride.duration)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 2 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: PlatformColor("systemBlue") as unknown as string,
                fontVariant: ["tabular-nums"],
              }}
            >
              {ride.avgSpeed.toFixed(1)}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: PlatformColor("secondaryLabel") as unknown as string,
              }}
            >
              km/h avg
            </Text>
          </View>
          <SymbolView
            name="chevron.right"
            size={14}
            tintColor={PlatformColor("tertiaryLabel") as unknown as string}
          />
        </Pressable>
      </Link>
    </Animated.View>
  );
}
