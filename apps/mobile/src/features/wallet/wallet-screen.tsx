import { Text, View } from "react-native";

import { mockWallet } from "@glide/api";
import { formatCurrency } from "@glide/shared";

import { ScreenShell } from "@/components/screen-shell";
import { SurfaceCard } from "@/components/surface-card";
import { colors, spacing } from "@/theme/tokens";

export function WalletScreen() {
  return (
    <ScreenShell
      title="Wallet"
      description="Wallet and transaction history are scaffolded with shared domain models so admin and mobile can read the same shape later.">
      <SurfaceCard tone="accent">
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          Current balance
        </Text>
        <Text selectable style={{ color: colors.text, fontSize: 32, fontWeight: "800" }}>
          {formatCurrency(mockWallet.balance)}
        </Text>
        <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
          {mockWallet.points} loyalty points
        </Text>
      </SurfaceCard>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {["$10", "$20", "$50"].map((amount) => (
          <View key={amount} style={{ flex: 1 }}>
            <SurfaceCard>
              <Text
                selectable
                style={{ color: colors.text, fontSize: 16, fontWeight: "700", textAlign: "center" }}>
                {amount}
              </Text>
            </SurfaceCard>
          </View>
        ))}
      </View>

      <View style={{ gap: spacing.md }}>
        {mockWallet.transactions.map((transaction) => (
          <SurfaceCard key={transaction.id}>
            <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "700" }}>
              {transaction.title}
            </Text>
            <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
              {transaction.subtitle}
            </Text>
            <Text selectable style={{ color: colors.textMuted, fontSize: 15 }}>
              {formatCurrency(transaction.amount)}
            </Text>
          </SurfaceCard>
        ))}
      </View>
    </ScreenShell>
  );
}
