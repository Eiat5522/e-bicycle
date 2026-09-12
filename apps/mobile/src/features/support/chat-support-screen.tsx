import { Text } from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { colors } from "@/theme/tokens";

export function ChatSupportScreen() {
  return (
    <ScreenShell
      title="Chat Support"
      description="Chat with us, Coming Soon.">
      <SurfaceCard tone="accent">
        <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
          Chat with us, Coming Soon
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          In-app support chat will land here once the live messaging flow is connected.
        </Text>
      </SurfaceCard>
    </ScreenShell>
  );
}
