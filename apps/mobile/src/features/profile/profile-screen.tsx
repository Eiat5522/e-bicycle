import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { formatCurrency, formatDistanceKm, type RideHistoryItem } from "@glide/shared";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { configuredRideHistoryService } from "@/lib/ride-history-service";
import { colors, spacing, typography } from "@/theme/tokens";

import { authFieldInputStyle, authFieldLabelStyle } from "../auth/auth-form-styles";
import { useAuth } from "../auth/auth-provider";
import { formatRideDate, formatRideDurationLabel } from "../ride/ride-history-formatters";

export function ProfileScreen() {
  const router = useRouter();
  const { profile, signOut, updateDisplayName, user } = useAuth();
  const riderName = profile?.firstName ?? "Rider";
  const email = user?.email ?? "No email available";
  const [displayName, setDisplayName] = useState(profile?.firstName ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRideHistory, setIsLoadingRideHistory] = useState(true);
  const [rideHistory, setRideHistory] = useState<readonly RideHistoryItem[]>([]);
  const [rideHistoryError, setRideHistoryError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.firstName ?? "");
    setIsEditingDisplayName(false);
  }, [profile?.firstName]);

  const loadRideHistory = useCallback(async () => {
    setIsLoadingRideHistory(true);
    setRideHistoryError(null);

    try {
      const nextRideHistory = await configuredRideHistoryService.getRideHistory();
      setRideHistory(nextRideHistory);
    } catch (error) {
      setRideHistory([]);
      setRideHistoryError(
        error instanceof Error ? error.message : "Unable to load your ride history."
      );
    } finally {
      setIsLoadingRideHistory(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadRideHistory();
    }, [loadRideHistory])
  );

  async function handleSaveDisplayName() {
    const trimmedDisplayName = displayName.trim();

    if (!trimmedDisplayName) {
      setErrorMessage("Enter a display name.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      await updateDisplayName(trimmedDisplayName);
      setDisplayName(trimmedDisplayName);
      setIsEditingDisplayName(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update your display name."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScreenShell
      title={riderName}
      description="Manage your rider account, view ride history, and access support options.">
      <SurfaceCard>
        <Text selectable style={authFieldLabelStyle}>
          Display name
        </Text>
        <TextInput
          autoCapitalize="words"
          autoCorrect={false}
          autoComplete="name"
          editable={isEditingDisplayName}
          placeholder="Enter your display name"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.coral}
          value={displayName}
          onChangeText={setDisplayName}
          style={{
            ...authFieldInputStyle,
            opacity: isEditingDisplayName ? 1 : 0.65
          }}
        />
        <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
          {email}
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          Update the name shown across your rider profile while keeping your ride history and
          account details intact.
        </Text>
        {errorMessage ? (
          <Text
            selectable
            accessibilityRole="alert"
            style={{ ...typography.bodyStrong, color: colors.coralDark }}>
            {errorMessage}
          </Text>
        ) : null}
        {isEditingDisplayName ? (
          <PrimaryButton
            label={isSaving ? "Saving..." : "Save Display Name"}
            onPress={() => void handleSaveDisplayName()}
            disabled={isSaving}
          />
        ) : (
          <PrimaryButton
            label="Edit"
            onPress={() => {
              setErrorMessage(null);
              setIsEditingDisplayName(true);
            }}
            variant="secondary"
          />
        )}
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

        {isLoadingRideHistory ? (
          <SurfaceCard tone="muted">
            <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
              Loading rides
            </Text>
            <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
              Pulling your completed rides from Supabase.
            </Text>
          </SurfaceCard>
        ) : rideHistoryError ? (
          <SurfaceCard tone="accent">
            <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
              Ride history unavailable
            </Text>
            <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
              {rideHistoryError}
            </Text>
            <PrimaryButton label="Retry" onPress={() => void loadRideHistory()} />
          </SurfaceCard>
        ) : rideHistory.length ? (
          rideHistory.map((ride, index) => (
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
