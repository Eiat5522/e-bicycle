import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { mockRideHistory } from "@glide/api";
import { formatCurrency, formatDistanceKm } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { colors, spacing } from "@/theme/tokens";

import { useAuth } from "../auth/auth-provider";
import { formatRideDate, formatRideDurationLabel } from "../ride/ride-history-formatters";

export function ProfileScreen() {
  const router = useRouter();
  const { profile, signOut, user } = useAuth();
  const riderName = profile?.firstName ?? "Rider";
  const email = user?.email ?? "No email available";

  return (
    <ScreenShell
      title={riderName}
      description="Manage your rider account, view ride history, and access support options.">
      <SurfaceCard>
        <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
          {email}
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          Notifications, payment methods, and ride preferences can keep expanding from this
          profile area without changing the auth flow.
        </Text>
      </SurfaceCard>

      <View style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <Text selectable style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}>
            Ride history
          </Text>
          <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
            Completed rides with route replay and trip details.
          </Text>
        </View>

        {mockRideHistory.length ? (
          mockRideHistory.map((ride, index) => (
            <Pressable
              key={ride.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ride details for ${ride.routeLabel}`}
              onPress={() => router.push(`../ride/history/${ride.id}`)}
            >
              <SurfaceCard tone={index === 0 ? "accent" : "default"}>
                <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
                  {ride.routeLabel}
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
                  {formatRideDate(ride.completedAt)} · {formatRideDurationLabel(ride.durationSec)}
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
                  {ride.startLocation} to {ride.endLocation}
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
                  {formatDistanceKm(ride.distanceKm)} · {formatCurrency(ride.totalCost)}
                </Text>
                <Text selectable style={{ color: colors.textMuted, fontSize: 14 }}>
                  Tap to open route details and replay.
                </Text>
              </SurfaceCard>
            </Pressable>
          ))
        ) : (
          <SurfaceCard tone="muted">
            <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
              No completed rides yet
            </Text>
            <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
              Your completed trips will appear here after your first ride.
            </Text>
          </SurfaceCard>
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        <PrimaryButton label="Open Support" onPress={() => router.push("/help")} />
        <PrimaryButton
          label="View Wallet"
          onPress={() => router.push("/(tabs)/wallet")}
          variant="secondary"
        />
        <PrimaryButton label="Sign Out" onPress={() => void signOut()} variant="secondary" />
      </View>
    </ScreenShell>
  );
}
