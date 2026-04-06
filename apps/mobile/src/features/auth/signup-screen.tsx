import { useRouter } from "expo-router";
import { Text } from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { colors } from "@/theme/tokens";

export function SignupScreen() {
  const router = useRouter();

  return (
    <ScreenShell
      title="Create your rider profile"
      description="The initial scaffold uses a simple form placeholder, but the route and feature folder are ready for real account creation.">
      <SurfaceCard>
        <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
          Next integrations
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          Firebase auth, wallet onboarding, and profile capture can slot into this feature without
          changing the route map.
        </Text>
      </SurfaceCard>

      <PrimaryButton label="Create Account" onPress={() => router.replace("/(tabs)")} />
    </ScreenShell>
  );
}
