import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";

import { formatDistanceKm } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { configuredRideHistoryService } from "@/lib/ride-history-service";
import { configuredWalletService } from "@/lib/wallet-service";
import { colors, spacing, typography } from "@/theme/tokens";

import { useAuth } from "../auth/auth-provider";
import { BADGE_DEFINITIONS } from "./badge-definitions";
import {
  aggregateRideStats,
  calculateStreakDays,
  computeEcoEquivalents,
  formatTotalRideTime,
  getUnlockedMilestones,
  type EcoEquivalents,
  type RideStats
} from "./eco-stats-utils";
import type { RewardMilestoneKey } from "@/lib/reward-milestones";

type ScreenState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | {
      readonly status: "loaded";
      readonly stats: RideStats;
      readonly points: number;
      readonly streakDays: number;
      readonly equivalents: EcoEquivalents;
      readonly unlockedMilestones: ReadonlySet<RewardMilestoneKey>;
    };

function StatCell({
  value,
  label,
  tone = "default"
}: {
  readonly value: string;
  readonly label: string;
  readonly tone?: "default" | "muted" | "accent";
}) {
  return (
    <View style={{ width: "48%" }}>
      <SurfaceCard tone={tone}>
        <Text selectable style={{ ...typography.metric, color: colors.text }}>
          {value}
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 13, fontWeight: "700" }}>
          {label}
        </Text>
      </SurfaceCard>
    </View>
  );
}

export function EcoImpactScreen() {
  const { profile } = useAuth();
  const riderName = profile?.firstName ?? "Rider";

  const [state, setState] = useState<ScreenState>({ status: "loading" });

  const loadData = useCallback(async () => {
    let active = true;
    setState({ status: "loading" });
    try {
      const [rides, wallet] = await Promise.all([
        configuredRideHistoryService.getRideHistory(),
        configuredWalletService.getWallet()
      ]);
      if (!active) return;
      const stats = aggregateRideStats(rides);
      
      setState({
        status: "loaded",
        stats,
        points: wallet.points,
        streakDays: calculateStreakDays(rides),
        equivalents: computeEcoEquivalents(stats.totalCo2SavedKg),
        unlockedMilestones: getUnlockedMilestones(rides, wallet)
      });
    } catch (error) {
      if (!active) return;
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Unable to load your eco stats."
      });
    }
    return () => { active = false; };
  }, []);

  useFocusEffect(
    useCallback(() => {
    const cleanup = loadData();
    return () => { cleanup?.then(c => c?.()); };
  }, [loadData])
  );

  return (
    <ScreenShell
      title={`${riderName}'s Eco Impact`}
      description="Your green footprint across every Bangkok ride.">
      {state.status === "loading" ? (
        <SurfaceCard tone="muted">
          <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
            Loading your stats
          </Text>
          <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
            Pulling ride history and wallet data…
          </Text>
        </SurfaceCard>
      ) : state.status === "error" ? (
        <SurfaceCard tone="accent">
          <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
            Stats unavailable
          </Text>
          <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
            {state.message}
          </Text>
          <PrimaryButton label="Retry" onPress={() => void loadData()} />
        </SurfaceCard>
      ) : (
        <>
          <View style={{ gap: spacing.xs }}>
            <Text selectable style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>
              Lifetime stats
            </Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <StatCell value={String(state.stats.totalRides)} label="Rides" />
            <StatCell
              value={formatDistanceKm(state.stats.totalDistanceKm)}
              label="Distance"
              tone="muted"
            />
            <StatCell
              value={`${state.stats.totalCo2SavedKg.toFixed(1)} kg`}
              label="CO₂ Saved"
              tone="accent"
            />
            <StatCell
              value={formatTotalRideTime(state.stats.totalDurationSec)}
              label="Ride Time"
            />
          </View>

          <View style={{ gap: spacing.xs }}>
            <Text selectable style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>
              Eco equivalent
            </Text>
          </View>

          <SurfaceCard tone="accent">
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <MaterialCommunityIcons name="tree-outline" size={22} color={colors.teal} />
              <Text
                selectable
                style={{ color: colors.text, fontSize: 15, lineHeight: 22, flex: 1 }}>
                ≈{" "}
                <Text style={{ fontWeight: "700" }}>
                  {state.equivalents.treesEquivalent.toFixed(1)} trees
                </Text>{" "}
                absorbing this CO₂ for a year
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <MaterialCommunityIcons name="car-off" size={22} color={colors.teal} />
              <Text
                selectable
                style={{ color: colors.text, fontSize: 15, lineHeight: 22, flex: 1 }}>
                ≈{" "}
                <Text style={{ fontWeight: "700" }}>
                  {state.equivalents.carTripsAvoided.toFixed(1)} fewer car trips
                </Text>{" "}
                in Bangkok
              </Text>
            </View>
            <Text selectable style={{ color: colors.textMuted, fontSize: 13, lineHeight: 18 }}>
              Based on 22 kg CO₂/tree/year and 2.3 kg CO₂/trip
            </Text>
          </SurfaceCard>

          <View style={{ gap: spacing.xs }}>
            <Text selectable style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>
              Your rewards
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <SurfaceCard>
                <MaterialCommunityIcons
                  name="star-four-points-outline"
                  size={28}
                  color={colors.teal}
                />
                <Text selectable style={{ ...typography.metric, color: colors.text }}>
                  {state.points}
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 13, fontWeight: "700" }}>
                  Loyalty points
                </Text>
              </SurfaceCard>
            </View>
            <View style={{ flex: 1 }}>
              <SurfaceCard tone={state.streakDays > 0 ? "accent" : "default"}>
                <MaterialCommunityIcons
                  name="fire"
                  size={28}
                  color={state.streakDays > 0 ? colors.teal : colors.textMuted}
                />
                <Text selectable style={{ ...typography.metric, color: colors.text }}>
                  {state.streakDays}
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 13, fontWeight: "700" }}>
                  Day streak
                </Text>
              </SurfaceCard>
            </View>
          </View>

          <View style={{ gap: spacing.xs }}>
            <Text selectable style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>
              Achievement badges
            </Text>
            <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
              Milestones earned across your rides and wallet activity.
            </Text>
          </View>

          <View style={{ gap: spacing.sm }}>
            {BADGE_DEFINITIONS.map((badge) => {
              const unlocked = state.unlockedMilestones.has(badge.key);
              return (
                <SurfaceCard key={badge.key} tone={unlocked ? "accent" : "default"}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                    <View
                      style={{
                        alignItems: "center",
                        backgroundColor: unlocked ? colors.teal : colors.surfaceMuted,
                        borderRadius: 22,
                        height: 44,
                        justifyContent: "center",
                        width: 44
                      }}>
                      <MaterialCommunityIcons
                        name={unlocked ? badge.icon : "lock-outline"}
                        size={22}
                        color={unlocked ? colors.surface : colors.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
                        {badge.label}
                      </Text>
                      <Text selectable style={{ color: colors.textMuted, fontSize: 13 }}>
                        {badge.description}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name={unlocked ? "check-circle-outline" : "circle-outline"}
                      size={20}
                      color={unlocked ? colors.teal : colors.textMuted}
                    />
                  </View>
                </SurfaceCard>
              );
            })}
          </View>
        </>
      )}
    </ScreenShell>
  );
}
