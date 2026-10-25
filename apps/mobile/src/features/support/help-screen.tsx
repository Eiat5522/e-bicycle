import { Text } from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { colors } from "@/theme/tokens";

export function HelpScreen() {
  return (
    <ScreenShell
      title="Support"
      description="Support is scaffolded as chatbot-first with a clear live agent escalation path.">
      <SurfaceCard tone="accent">
        <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
          Chatbot first
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          Common ride, wallet, and unlock issues should resolve here before escalating to a live
          agent.
        </Text>
      </SurfaceCard>

      <SurfaceCard>
        <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
          Live agent escalation
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15, lineHeight: 22 }}>
          This placeholder feature will connect to a real support SDK once operations tooling is in
          place.
        </Text>
      </SurfaceCard>
    </ScreenShell>
  );
}
