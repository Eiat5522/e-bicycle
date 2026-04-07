import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput } from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { colors, radii, spacing } from "@/theme/tokens";

import { useAuth } from "./auth-context";

export function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn() {
    setIsSubmitting(true);
    setErrorMessage(undefined);

    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenShell
      title="Welcome back"
      description="Sign in with your rider email and password.">
      <SurfaceCard>
        <Text selectable style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600" }}>
          Email
        </Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="Enter your email"
          onChangeText={setEmail}
          value={email}
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
          onChangeText={setPassword}
          value={password}
          style={{
            backgroundColor: colors.surfaceMuted,
            borderRadius: radii.medium,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm
          }}
        />
        {errorMessage ? (
          <Text selectable style={{ color: colors.coralDark, fontSize: 14, fontWeight: "700" }}>
            {errorMessage}
          </Text>
        ) : null}
      </SurfaceCard>

      <PrimaryButton
        disabled={isSubmitting || email.trim().length === 0 || password.length === 0}
        label={isSubmitting ? "Signing in..." : "Sign In"}
        onPress={() => {
          void handleSignIn();
        }}
      />
    </ScreenShell>
  );
}
