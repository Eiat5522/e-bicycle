import { ActivityIndicator, Text, View } from "react-native";

import { colors, fontFamilies } from "@/theme/tokens";

export default function AuthCallbackScreen() {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.background,
        flex: 1,
        gap: 16,
        justifyContent: "center",
        paddingHorizontal: 24
      }}>
      <ActivityIndicator color={colors.coralDark} size="large" />
      <Text
        selectable
        style={{
          color: colors.textMuted,
          fontFamily: fontFamilies.medium,
          fontSize: 16,
          textAlign: "center"
        }}>
        Finishing your email sign-in...
      </Text>
    </View>
  );
}
