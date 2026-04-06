import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Text, View } from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { colors, spacing } from "@/theme/tokens";

export function UnlockScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  return (
    <ScreenShell
      title={`Unlock ${params.id ?? "your bike"}`}
      description="The unlock route keeps the QR and Bluetooth entry points isolated so native capabilities can be added without touching the rest of the ride flow.">
      <SurfaceCard tone="accent">
        <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
          Scan QR or connect over Bluetooth
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          Expo Go is enough for the current scaffold. A dev client only becomes necessary once
          custom native integrations are added.
        </Text>
      </SurfaceCard>

      <View style={{ gap: spacing.sm }}>
        <PrimaryButton
          label="Simulate Successful Unlock"
          onPress={() => router.push("/ride/active")}
        />
        <PrimaryButton
          label="Retry Bluetooth"
          variant="secondary"
          onPress={() => Alert.alert("Coming Soon", "Bluetooth retry not yet implemented")}
        />
      </View>
    </ScreenShell>
  );
}
