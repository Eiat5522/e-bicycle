/* eslint-disable @typescript-eslint/no-require-imports */

describe("configuredWalletService", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("hydrates wallet data from Supabase rows", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: "user-1",
        balance: 24.5,
        points: 120,
        payment_methods: ["Visa **** 4242"],
        created_at: "2026-04-11T00:00:00Z",
        updated_at: "2026-04-11T00:00:00Z"
      },
      error: null
    });
    const walletEq = jest.fn().mockReturnValue({ maybeSingle });
    const walletSelect = jest.fn().mockReturnValue({ eq: walletEq });

    const transactionsOrder = jest.fn().mockResolvedValue({
      data: [
        {
          id: "txn-1",
          wallet_id: "user-1",
          type: "top_up",
          title: "Wallet Top-up",
          subtitle: "Via Credit/Debit Card",
          amount: 20,
          created_at: "2026-04-11T01:00:00Z"
        }
      ],
      error: null
    });
    const transactionsEq = jest.fn().mockReturnValue({ order: transactionsOrder });
    const transactionsSelect = jest.fn().mockReturnValue({ eq: transactionsEq });

    const from = jest.fn((table: string) => {
      if (table === "wallets") {
        return { select: walletSelect };
      }

      return { select: transactionsSelect };
    });

    const getSession = jest.fn().mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1"
          }
        }
      }
    });

    jest.doMock("./supabase", () => ({
      hasSupabaseConfig: true,
      supabase: {
        auth: { getSession },
        from,
        rpc: jest.fn()
      }
    }));

    const { configuredWalletService } = require("./wallet-service") as typeof import("./wallet-service");

    const wallet = await configuredWalletService.getWallet();

    expect(getSession).toHaveBeenCalled();
    expect(wallet.balance).toBe(24.5);
    expect(wallet.points).toBe(120);
    expect(wallet.paymentMethods).toEqual(["Visa **** 4242"]);
    expect(wallet.transactions[0]).toEqual(
      expect.objectContaining({
        id: "txn-1",
        type: "top_up",
        amount: 20
      })
    );
  });

  it("applies top-ups through the Supabase rpc and reloads the wallet", async () => {
    const getSession = jest.fn().mockResolvedValue({
      data: {
        session: {
          user: {
            id: "user-1"
          }
        }
      }
    });
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: "user-1",
        balance: 44.5,
        points: 320,
        payment_methods: ["Visa **** 4242"],
        created_at: "2026-04-11T00:00:00Z",
        updated_at: "2026-04-11T02:00:00Z"
      },
      error: null
    });
    const walletEq = jest.fn().mockReturnValue({ maybeSingle });
    const walletSelect = jest.fn().mockReturnValue({ eq: walletEq });
    const transactionsOrder = jest.fn().mockResolvedValue({
      data: [],
      error: null
    });
    const transactionsEq = jest.fn().mockReturnValue({ order: transactionsOrder });
    const transactionsSelect = jest.fn().mockReturnValue({ eq: transactionsEq });
    const from = jest.fn((table: string) => {
      if (table === "wallets") {
        return { select: walletSelect };
      }

      return { select: transactionsSelect };
    });
    const rpc = jest.fn().mockResolvedValue({ error: null });

    jest.doMock("./supabase", () => ({
      hasSupabaseConfig: true,
      supabase: {
        auth: { getSession },
        from,
        rpc
      }
    }));

    const { configuredWalletService } = require("./wallet-service") as typeof import("./wallet-service");

    const wallet = await configuredWalletService.applyTopUp({
      amount: 20,
      methodLabel: "Credit/Debit Card",
      title: "Wallet Top-up"
    });

    expect(rpc).toHaveBeenCalledWith("apply_wallet_top_up", {
      p_amount: 20,
      p_title: "Wallet Top-up",
      p_subtitle: "Via Credit/Debit Card"
    });
    expect(wallet.balance).toBe(44.5);
    expect(wallet.points).toBe(320);
  });
});
