import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { colors, spacing } from "@/theme/tokens";

export function WelcomeScreen() {
  const router = useRouter();

  return (
    <ScreenShell
      title="Glide into the city."
      description="Expo powers the mobile scaffold, while the product UI follows the playful Stitch direction for the core e-bike journey.">
      <SurfaceCard tone="accent">
        <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
          Built-in starter flows
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          Map, bike details, unlock, active ride, wallet, profile, and support are all wired into
          Expo Router.
        </Text>
      </SurfaceCard>

      <View style={{ gap: spacing.sm }}>
        <PrimaryButton label="Continue to Login" onPress={() => router.push("/(auth)/login")} />
        <PrimaryButton
          label="Create an Account"
          onPress={() => router.push("/(auth)/signup")}
          variant="secondary"
        />
      </View>
    </ScreenShell>
  );
}
