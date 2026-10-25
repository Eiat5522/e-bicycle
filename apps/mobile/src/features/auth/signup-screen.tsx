import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";

import { PrimaryButton } from "@/components/primary-button";
import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { colors, spacing, typography } from "@/theme/tokens";

import { authFieldInputStyle, authFieldLabelStyle } from "./auth-form-styles";
import { useAuth } from "./auth-provider";

export function SignupScreen() {
  const router = useRouter();
  const { authError, configError, signUp } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(configError ?? authError);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setErrorMessage(configError ?? authError ?? null);
  }, [authError, configError]);

  async function handleSignUp() {
    const trimmedFirstName = firstName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedFirstName || !trimmedEmail || !password) {
      setErrorMessage("Enter your first name, email, and password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setInfoMessage(null);

    try {
      const result = await signUp(trimmedFirstName, trimmedEmail, password);

      if (result.status === "awaiting_email_confirmation") {
        setInfoMessage("Check your email to confirm your account, then return to the app to finish signing in.");
        return;
      }

      setInfoMessage("Account created. Restoring your rider session...");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create your account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenShell
      title="Create your rider profile"
      description="Start with your name, email, and password. Supabase creates your rider account and profile in one pass.">
      <SurfaceCard>
        <Text selectable style={authFieldLabelStyle}>
          First name
        </Text>
        <TextInput
          autoCapitalize="words"
          autoCorrect={false}
          autoComplete="name-given"
          placeholder="Enter your first name"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.teal}
          value={firstName}
          onChangeText={setFirstName}
          style={authFieldInputStyle}
        />
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
          autoComplete="new-password"
          placeholder="Create a password"
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
        {infoMessage ? (
          <Text selectable style={{ ...typography.bodyStrong, color: colors.teal }}>
            {infoMessage}
          </Text>
        ) : null}
      </SurfaceCard>

      <SurfaceCard tone="muted">
        <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
          What happens next
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          Your account signs in immediately, and a matching rider profile row is created in
          Supabase for app-specific data.
        </Text>
      </SurfaceCard>

      <View style={{ gap: spacing.sm }}>
        <PrimaryButton
          label={isSubmitting ? "Creating Account..." : "Create Account"}
          onPress={() => void handleSignUp()}
          disabled={isSubmitting}
        />
        <PrimaryButton
          label="Back to Login"
          onPress={() => router.push("/(auth)/login")}
          variant="secondary"
        />
      </View>
    </ScreenShell>
  );
}
