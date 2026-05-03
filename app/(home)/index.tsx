import { ScrollView, View, Text, PlatformColor, Pressable } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { StatCard } from "@/components/stat-card";
import { BatteryIndicator } from "@/components/battery-indicator";
import { RideItem } from "@/components/ride-item";
import { bikeStats, mockRides } from "@/utils/mock-data";
import { SymbolView } from "expo-symbols";

export default function HomeScreen() {
  const router = useRouter();
  const recentRides = mockRides.slice(0, 3);

  function handleStartRide() {
    if (process.env.EXPO_OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.navigate("/(ride)");
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
    >
      <BatteryIndicator percent={bikeStats.batteryPercent} delay={0} />

      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard
          title="Speed"
          value={bikeStats.currentSpeed.toFixed(0)}
          unit="km/h"
          icon="speedometer"
          accentColor="#30D158"
          delay={100}
        />
        <StatCard
          title="Range"
          value={bikeStats.rangeKm.toFixed(0)}
          unit="km"
          icon="arrow.forward"
          accentColor="#FF9F0A"
          delay={150}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard
          title="Total Distance"
          value={bikeStats.totalDistanceKm.toFixed(0)}
          unit="km"
          icon="map"
          accentColor="#0A84FF"
          delay={200}
        />
        <StatCard
          title="Rides"
          value={bikeStats.ridesCount.toString()}
          unit="total"
          icon="flag.checkered"
          accentColor="#BF5AF2"
          delay={250}
        />
      </View>

      <Animated.View entering={FadeInDown.duration(400).delay(300).springify()}>
        <Pressable
          onPress={handleStartRide}
          style={({ pressed }) => ({
            backgroundColor: PlatformColor("systemBlue") as unknown as string,
            borderRadius: 16,
            padding: 18,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 10,
            opacity: pressed ? 0.85 : 1,
            borderCurve: "continuous",
            boxShadow: "0 4px 16px rgba(10,132,255,0.35)",
          })}
        >
          <SymbolView name="play.fill" size={20} tintColor="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>
            Start Ride
          </Text>
        </Pressable>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(400).delay(350).springify()} style={{ gap: 0 }}>
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: PlatformColor("label") as unknown as string,
            marginBottom: 10,
          }}
        >
          Recent Rides
        </Text>
        <View
          style={{
            borderRadius: 16,
            overflow: "hidden",
            borderCurve: "continuous",
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
          }}
        >
          {recentRides.map((ride, index) => (
            <View key={ride.id}>
              <RideItem ride={ride} index={index} />
              {index < recentRides.length - 1 && (
                <View
                  style={{
                    height: 0.5,
                    backgroundColor: PlatformColor("separator") as unknown as string,
                    marginLeft: 68,
                  }}
                />
              )}
            </View>
          ))}
        </View>
      </Animated.View>
    </ScrollView>
  );
}
