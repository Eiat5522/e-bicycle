import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { colors, spacing, typography } from "@/theme/tokens";

import { authFieldInputStyle, authFieldLabelStyle } from "./auth-form-styles";
import { useAuth } from "./auth-provider";

export function LoginScreen() {
  const router = useRouter();
  const { configError, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (configError) {
      setErrorMessage(configError);
    }
  }, [configError]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn() {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setErrorMessage("Enter both your email and password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await signIn(trimmedEmail, password);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenShell
      title="Welcome back"
      description="Sign in with your Supabase rider account to restore your profile and pick up where you left off.">
      <SurfaceCard tone="muted">
        <Text selectable style={authFieldLabelStyle}>
          Email
        </Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          placeholder="Enter your email"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.teal}
          value={email}
          onChangeText={setEmail}
          style={authFieldInputStyle}
        />
        <Text selectable style={authFieldLabelStyle}>
          Password
        </Text>
        <TextInput
          secureTextEntry
          autoComplete="password"
          placeholder="Enter your password"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.teal}
          value={password}
          onChangeText={setPassword}
          style={authFieldInputStyle}
        />

        {errorMessage ? (
          <Text
            selectable
            accessibilityRole="alert"
            style={{ ...typography.bodyStrong, color: colors.danger }}>
            {errorMessage}
          </Text>
        ) : null}
      </SurfaceCard>

      <View style={{ gap: spacing.sm }}>
        <PrimaryButton
          label={isSubmitting ? "Signing In..." : "Sign In"}
          onPress={() => void handleSignIn()}
          disabled={isSubmitting}
        />
        <PrimaryButton
          label="Create an Account"
          onPress={() => router.push("/(auth)/signup")}
          variant="secondary"
        />
      </View>
    </ScreenShell>
  );
}
