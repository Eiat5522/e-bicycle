import type { Wallet, WalletTransaction } from "@glide/shared";

import { walletService as mockWalletService } from "@glide/api";

import { hasSupabaseConfig, supabase } from "./supabase";
import type { Database } from "./supabase.types";

type WalletRow = Database["public"]["Tables"]["wallets"]["Row"];
type WalletTransactionRow = Database["public"]["Tables"]["wallet_transactions"]["Row"];

export interface ConfiguredWalletService {
  getWallet(): Promise<Wallet>;
  applyTopUp(input: { amount: number; methodLabel: string; title: string }): Promise<Wallet>;
}

function mapTransactionRow(row: WalletTransactionRow): WalletTransaction {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    subtitle: row.subtitle,
    amount: row.amount,
    timestamp: row.created_at
  };
}

function mapWallet(row: WalletRow, transactions: WalletTransactionRow[]): Wallet {
  return {
    balance: row.balance,
    points: row.points,
    paymentMethods: row.payment_methods,
    transactions: transactions.map(mapTransactionRow)
  };
}

async function getAuthenticatedUserId() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  return session?.user.id ?? null;
}

function createSupabaseWalletService(): ConfiguredWalletService {
  return {
    async getWallet() {
      const userId = await getAuthenticatedUserId();

      if (!userId) {
        throw new Error("No active rider session was found.");
      }

      const [{ data: walletRow, error: walletError }, { data: transactions, error: transactionsError }] =
        await Promise.all([
          supabase
            .from("wallets")
            .select("id, balance, points, payment_methods, created_at, updated_at")
            .eq("id", userId)
            .maybeSingle(),
          supabase
            .from("wallet_transactions")
            .select("id, wallet_id, type, title, subtitle, amount, created_at")
            .eq("wallet_id", userId)
            .order("created_at", { ascending: false })
        ]);

      if (walletError) {
        throw new Error(`Failed to fetch wallet: ${walletError.message}`);
      }

      if (transactionsError) {
        throw new Error(`Failed to fetch wallet transactions: ${transactionsError.message}`);
      }

      if (!walletRow) {
        throw new Error("Wallet record is missing for this rider.");
      }

      return mapWallet(walletRow, transactions ?? []);
    },
    async applyTopUp({ amount, methodLabel, title }) {
      const { error } = await supabase.rpc(
        "apply_wallet_top_up",
        {
          p_amount: amount,
          p_title: title,
          p_subtitle: `Via ${methodLabel}`
        } as never
      );

      if (error) {
        throw new Error(`Failed to apply wallet top-up: ${error.message}`);
      }

      return this.getWallet();
    }
  };
}

export const configuredWalletService: ConfiguredWalletService = hasSupabaseConfig
  ? createSupabaseWalletService()
  : {
      async getWallet() {
        return mockWalletService.getWallet();
      },
      async applyTopUp({ amount, methodLabel, title }) {
        const wallet = await mockWalletService.getWallet();
        const nextTransaction: WalletTransaction = {
          id: `txn_${Date.now()}`,
          type: "top_up",
          title,
          subtitle: `Via ${methodLabel}`,
          amount,
          timestamp: new Date().toISOString()
        };

        return {
          balance: wallet.balance + amount,
          points: wallet.points,
          paymentMethods: wallet.paymentMethods,
          transactions: [nextTransaction, ...wallet.transactions]
        };
      }
    };
