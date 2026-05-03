import { ScrollView, View, Text, PlatformColor } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { mockRides, formatDate, formatDuration } from "@/utils/mock-data";
import { BlurView } from "expo-blur";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SymbolView } from "expo-symbols";

interface DetailCardProps {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
  unit: string;
  delay?: number;
}

function DetailCard({ icon, iconColor, label, value, unit, delay = 0 }: DetailCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(350).delay(delay).springify()}
      style={{ flex: 1, minWidth: "45%" }}
    >
      <BlurView
        tint="systemMaterial"
        intensity={80}
        style={{
          borderRadius: 16,
          overflow: "hidden",
          padding: 16,
          borderCurve: "continuous",
          gap: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <SymbolView name={icon as any} size={16} tintColor={iconColor} />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: PlatformColor("secondaryLabel") as unknown as string,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {label}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
          <Text
            style={{
              fontSize: 26,
              fontWeight: "700",
              color: PlatformColor("label") as unknown as string,
              fontVariant: ["tabular-nums"],
            }}
          >
            {value}
          </Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: PlatformColor("secondaryLabel") as unknown as string,
            }}
          >
            {unit}
          </Text>
        </View>
      </BlurView>
    </Animated.View>
  );
}

export default function RideDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ride = mockRides.find((r) => r.id === id);

  if (!ride) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: PlatformColor("secondaryLabel") as unknown as string }}>
          Ride not found
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
    >
      <Animated.View entering={FadeInDown.duration(400).springify()}>
        <BlurView
          tint="systemMaterial"
          intensity={80}
          style={{
            borderRadius: 20,
            overflow: "hidden",
            padding: 20,
            borderCurve: "continuous",
            gap: 4,
            boxShadow: "0 4px 16px rgba(0,0,0,0.09)",
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: PlatformColor("label") as unknown as string,
            }}
          >
            {ride.name}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: PlatformColor("secondaryLabel") as unknown as string,
            }}
          >
            {formatDate(ride.date)}
          </Text>
        </BlurView>
      </Animated.View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <DetailCard
          icon="map"
          iconColor="#0A84FF"
          label="Distance"
          value={ride.distance.toFixed(1)}
          unit="km"
          delay={50}
        />
        <DetailCard
          icon="timer"
          iconColor="#FF9F0A"
          label="Duration"
          value={formatDuration(ride.duration)}
          unit=""
          delay={100}
        />
        <DetailCard
          icon="speedometer"
          iconColor="#30D158"
          label="Avg Speed"
          value={ride.avgSpeed.toFixed(1)}
          unit="km/h"
          delay={150}
        />
        <DetailCard
          icon="bolt.fill"
          iconColor="#FF453A"
          label="Max Speed"
          value={ride.maxSpeed.toFixed(1)}
          unit="km/h"
          delay={200}
        />
        <DetailCard
          icon="mountain.2.fill"
          iconColor="#BF5AF2"
          label="Elevation"
          value={ride.elevation.toString()}
          unit="m"
          delay={250}
        />
        <DetailCard
          icon="flame.fill"
          iconColor="#FF6B35"
          label="Calories"
          value={ride.calories.toString()}
          unit="kcal"
          delay={300}
        />
      </View>
    </ScrollView>
  );
}
