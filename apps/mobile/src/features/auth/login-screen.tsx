import { useRouter } from "expo-router";
import { Text, TextInput } from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { colors, radii, spacing } from "@/theme/tokens";

export function LoginScreen() {
  const router = useRouter();

  return (
    <ScreenShell
      title="Welcome back"
      description="This scaffold keeps auth light for now, but the route structure is ready for real Firebase or backend auth later.">
      <SurfaceCard>
        <Text selectable style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600" }}>
          Email
        </Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="Enter your email"
          style={{
            backgroundColor: colors.surfaceMuted,
            borderRadius: radii.medium,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm
          }}
        />
        <Text selectable style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600" }}>
          Password
        </Text>
        <TextInput
          secureTextEntry
          autoComplete="password"
          placeholder="Enter your password"
          style={{
            backgroundColor: colors.surfaceMuted,
            borderRadius: radii.medium,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm
          }}
        />
      </SurfaceCard>

      <PrimaryButton label="Sign In" onPress={() => router.replace("/(tabs)")} />
    </ScreenShell>
  );
}
