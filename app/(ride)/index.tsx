import { ScrollView, View, Text, PlatformColor, Pressable } from "react-native";
import { useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { SymbolView } from "expo-symbols";
import { formatDuration } from "@/utils/mock-data";

type RideState = "idle" | "running" | "paused";

export default function RideScreen() {
  const [rideState, setRideState] = useState<RideState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [calories, setCalories] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedScale = useSharedValue(1);

  useEffect(() => {
    if (rideState === "running") {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
        const newSpeed = 15 + Math.random() * 10;
        setSpeed(newSpeed);
        setDistance((d) => d + newSpeed / 3600);
        setCalories((c) => c + newSpeed * 0.012);
        speedScale.value = withSpring(1.05, { damping: 10 });
        setTimeout(() => {
          speedScale.value = withSpring(1, { damping: 10 });
        }, 100);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [rideState, speedScale]);

  const speedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: speedScale.value }],
  }));

  function handleStart() {
    if (process.env.EXPO_OS === "ios") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRideState("running");
  }

  function handlePause() {
    if (process.env.EXPO_OS === "ios") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRideState(rideState === "paused" ? "running" : "paused");
  }

  function handleStop() {
    if (process.env.EXPO_OS === "ios")
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRideState("idle");
    setElapsedSeconds(0);
    setDistance(0);
    setSpeed(0);
    setCalories(0);
  }

  if (rideState === "idle") {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          gap: 24,
        }}
      >
        <Animated.View
          entering={FadeInDown.duration(500).springify()}
          style={{ alignItems: "center", gap: 16 }}
        >
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: PlatformColor("systemBlue") as unknown as string,
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 32px rgba(10,132,255,0.4)",
            }}
          >
            <SymbolView name="bicycle" size={52} tintColor="#FFFFFF" />
          </View>
          <Text
            style={{
              fontSize: 26,
              fontWeight: "700",
              color: PlatformColor("label") as unknown as string,
            }}
          >
            Ready to Ride?
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: PlatformColor("secondaryLabel") as unknown as string,
              textAlign: "center",
            }}
          >
            Start tracking your ride to see live stats including speed, distance, and calories.
          </Text>
          <Pressable
            onPress={handleStart}
            style={({ pressed }) => ({
              backgroundColor: PlatformColor("systemBlue") as unknown as string,
              borderRadius: 16,
              paddingVertical: 16,
              paddingHorizontal: 48,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              opacity: pressed ? 0.85 : 1,
              borderCurve: "continuous",
              boxShadow: "0 4px 16px rgba(10,132,255,0.35)",
            })}
          >
            <SymbolView name="play.fill" size={20} tintColor="#FFFFFF" />
            <Text style={{ color: "#FFFFFF", fontSize: 17, fontWeight: "700" }}>Start Ride</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
    >
      <Animated.View entering={FadeInDown.duration(400).springify()}>
        <BlurView
          tint="systemMaterial"
          intensity={80}
          style={{
            borderRadius: 24,
            overflow: "hidden",
            padding: 32,
            borderCurve: "continuous",
            alignItems: "center",
            gap: 4,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: PlatformColor("secondaryLabel") as unknown as string,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Current Speed
          </Text>
          <Animated.View
            style={[{ flexDirection: "row", alignItems: "baseline", gap: 6 }, speedStyle]}
          >
            <Text
              style={{
                fontSize: 80,
                fontWeight: "800",
                color: "#30D158",
                fontVariant: ["tabular-nums"],
              }}
            >
              {speed.toFixed(1)}
            </Text>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "600",
                color: PlatformColor("secondaryLabel") as unknown as string,
              }}
            >
              km/h
            </Text>
          </Animated.View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: rideState === "running" ? "#30D158" : "#FF9F0A",
              }}
            />
            <Text
              style={{
                fontSize: 13,
                color: PlatformColor("secondaryLabel") as unknown as string,
                fontWeight: "500",
              }}
            >
              {rideState === "running" ? "Recording" : "Paused"}
            </Text>
          </View>
        </BlurView>
      </Animated.View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <Animated.View style={{ flex: 1 }} entering={FadeInDown.duration(400).delay(100).springify()}>
          <BlurView
            tint="systemMaterial"
            intensity={80}
            style={{
              borderRadius: 16,
              overflow: "hidden",
              padding: 16,
              borderCurve: "continuous",
              alignItems: "center",
              gap: 4,
            }}
          >
            <SymbolView name="timer" size={20} tintColor="#FF9F0A" />
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: PlatformColor("label") as unknown as string,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatDuration(elapsedSeconds)}
            </Text>
            <Text style={{ fontSize: 12, color: PlatformColor("secondaryLabel") as unknown as string }}>
              Time
            </Text>
          </BlurView>
        </Animated.View>
        <Animated.View style={{ flex: 1 }} entering={FadeInDown.duration(400).delay(150).springify()}>
          <BlurView
            tint="systemMaterial"
            intensity={80}
            style={{
              borderRadius: 16,
              overflow: "hidden",
              padding: 16,
              borderCurve: "continuous",
              alignItems: "center",
              gap: 4,
            }}
          >
            <SymbolView name="map" size={20} tintColor="#0A84FF" />
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: PlatformColor("label") as unknown as string,
                fontVariant: ["tabular-nums"],
              }}
            >
              {distance.toFixed(2)}
            </Text>
            <Text style={{ fontSize: 12, color: PlatformColor("secondaryLabel") as unknown as string }}>
              km
            </Text>
          </BlurView>
        </Animated.View>
        <Animated.View style={{ flex: 1 }} entering={FadeInDown.duration(400).delay(200).springify()}>
          <BlurView
            tint="systemMaterial"
            intensity={80}
            style={{
              borderRadius: 16,
              overflow: "hidden",
              padding: 16,
              borderCurve: "continuous",
              alignItems: "center",
              gap: 4,
            }}
          >
            <SymbolView name="flame.fill" size={20} tintColor="#FF453A" />
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: PlatformColor("label") as unknown as string,
                fontVariant: ["tabular-nums"],
              }}
            >
              {Math.round(calories)}
            </Text>
            <Text style={{ fontSize: 12, color: PlatformColor("secondaryLabel") as unknown as string }}>
              kcal
            </Text>
          </BlurView>
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeInUp.duration(400).delay(250).springify()}
        style={{ flexDirection: "row", gap: 12 }}
      >
        <Pressable
          onPress={handlePause}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: PlatformColor("systemOrange") as unknown as string,
            borderRadius: 16,
            padding: 16,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            opacity: pressed ? 0.85 : 1,
            borderCurve: "continuous",
          })}
        >
          <SymbolView
            name={rideState === "paused" ? "play.fill" : "pause.fill"}
            size={18}
            tintColor="#FFFFFF"
          />
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>
            {rideState === "paused" ? "Resume" : "Pause"}
          </Text>
        </Pressable>
        <Pressable
          onPress={handleStop}
          style={({ pressed }) => ({
            flex: 1,
            backgroundColor: PlatformColor("systemRed") as unknown as string,
            borderRadius: 16,
            padding: 16,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            opacity: pressed ? 0.85 : 1,
            borderCurve: "continuous",
          })}
        >
          <SymbolView name="stop.fill" size={18} tintColor="#FFFFFF" />
          <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>Stop</Text>
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}
