import type { ReactNode } from "react";
import { SafeAreaView, View, type ViewStyle } from "react-native";

import { colors, spacing } from "@/theme/tokens";

interface ScreenProps {
  readonly children: ReactNode;
  readonly padded?: boolean;
  readonly style?: ViewStyle;
}

export function Screen({ children, padded = false, style }: ScreenProps) {
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: colors.background }, style]}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: padded ? spacing.md : 0
        }}>
        {children}
      </View>
    </SafeAreaView>
  );
}
