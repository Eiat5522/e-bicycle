import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { mockUser } from "@glide/api";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { colors, spacing } from "@/theme/tokens";

export function ProfileScreen() {
  const router = useRouter();

  return (
    <ScreenShell
      title={mockUser.firstName}
      description="Profile, settings, and support entry points are scaffolded here without coupling them to backend auth yet.">
      <SurfaceCard>
        <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
          {mockUser.email}
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          Notifications, payment methods, and ride preferences will live in this feature area.
        </Text>
      </SurfaceCard>

      <View style={{ gap: spacing.sm }}>
        <PrimaryButton label="Open Support" onPress={() => router.push("/help")} />
        <PrimaryButton
          label="View Wallet"
          onPress={() => router.push("/(tabs)/wallet")}
          variant="secondary"
        />
      </View>
    </ScreenShell>
  );
}
