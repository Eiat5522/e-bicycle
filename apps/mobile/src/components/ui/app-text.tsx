import type { ReactNode } from "react";
import { Text, type TextProps, type TextStyle } from "react-native";

import { colors } from "@/theme/tokens";
import { type TypeKey, type } from "@/theme/typography";

interface AppTextProps extends TextProps {
  readonly children: ReactNode;
  readonly variant?: TypeKey;
  readonly color?: string;
  readonly align?: TextStyle["textAlign"];
}

export function AppText({
  children,
  variant = "body",
  color = colors.text,
  align,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text selectable style={[type[variant], { color, textAlign: align }, style]} {...rest}>
      {children}
    </Text>
  );
}
