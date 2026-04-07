import type { ReactNode } from "react";
import { View } from "react-native";

interface StackProps {
  readonly children: ReactNode;
  readonly gap?: number;
}

export function Stack({ children, gap = 12 }: StackProps) {
  return <View style={{ gap }}>{children}</View>;
}
