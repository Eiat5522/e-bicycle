import type { ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { colors, radii, shadows, spacing } from "@/theme/tokens";

interface BottomSheetProps {
  readonly visible: boolean;
  readonly title?: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

export function BottomSheet({ visible, title, onClose, children }: BottomSheetProps) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.28)"
        }}>
        <Pressable
          onPress={() => undefined}
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.sm,
            paddingBottom: spacing.xxl,
            gap: spacing.md,
            ...shadows.floating
          }}>
          <View
            style={{
              alignSelf: "center",
              width: 52,
              height: 5,
              borderRadius: radii.pill,
              backgroundColor: colors.surfaceStrong,
              marginBottom: spacing.xs
            }}
          />
          {title ? <AppText variant="h3">{title}</AppText> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
