import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, TextInput } from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { colors, radii, spacing } from "@/theme/tokens";

import { useAuth } from "./auth-context";

export function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignUp() {
    setIsSubmitting(true);
    setErrorMessage(undefined);

    try {
      await signUp({
        email: email.trim(),
        firstName: firstName.trim(),
        password
      });
      router.replace("/(tabs)");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenShell
      title="Create your rider profile"
      description="Create your rider account with Supabase email and password authentication.">
      <SurfaceCard>
        <Text selectable style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600" }}>
          First name
        </Text>
        <TextInput
          autoComplete="name"
          placeholder="Enter your first name"
          onChangeText={setFirstName}
          value={firstName}
          style={{
            backgroundColor: colors.surfaceMuted,
            borderRadius: radii.medium,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm
          }}
        />
        <Text selectable style={{ color: colors.textMuted, fontSize: 13, fontWeight: "600" }}>
          Email
        </Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
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
          autoComplete="new-password"
          placeholder="Create a password"
          secureTextEntry
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
        disabled={
          isSubmitting ||
          firstName.trim().length === 0 ||
          email.trim().length === 0 ||
          password.length < 6
        }
        label={isSubmitting ? "Creating account..." : "Create Account"}
        onPress={() => {
          void handleSignUp();
        }}
      />
    </ScreenShell>
  );
}
