import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import type { Wallet } from "@glide/shared";

import { configuredWalletService } from "@/lib/wallet-service";

import { WalletScreen } from "./wallet-screen";

jest.mock("expo-router", () => ({
  useRouter: jest.fn()
}));

jest.mock("@/lib/wallet-service", () => ({
  configuredWalletService: {
    getWallet: jest.fn(),
    applyTopUp: jest.fn()
  }
}));

describe("WalletScreen", () => {
  const push = jest.fn();

  const initialWallet: Wallet = {
    balance: 24.5,
    points: 120,
    paymentMethods: ["Visa **** 4242"],
    transactions: [
      {
        id: "txn-1",
        type: "ride",
        title: "Ride to Downtown",
        subtitle: "Oct 24, 2023 • 14 mins",
        amount: -4.2,
        timestamp: "2023-10-24T12:00:00Z"
      },
      {
        id: "txn-2",
        type: "reward",
        title: "Ride refund",
        subtitle: "Oct 23, 2023 • Support credit",
        amount: 2.1,
        timestamp: "2023-10-23T12:00:00Z"
      }
    ]
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(configuredWalletService.getWallet).mockResolvedValue(initialWallet);
    jest.mocked(configuredWalletService.applyTopUp).mockImplementation(async ({ amount, methodLabel, title }) => ({
      balance: initialWallet.balance + amount,
      points: initialWallet.points + amount * 10,
      paymentMethods: initialWallet.paymentMethods,
      transactions: [
        {
          id: `top-up-${amount}`,
          type: "top_up",
          title,
          subtitle: `Via ${methodLabel}`,
          amount,
          timestamp: "2026-04-14T10:00:00Z"
        },
        ...initialWallet.transactions
      ]
    }));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  async function settleTopUpFlow() {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(5000);
    });
  }

  it("renders wallet content from the configured wallet service", async () => {
    const screen = render(<WalletScreen />);

    expect(screen.getByText("Wallet")).toBeTruthy();
    expect(await screen.findByText("฿24.50")).toBeTruthy();
  });

  it("renders the Mobile Banking payment method option", async () => {
    const screen = render(<WalletScreen />);

    expect(await screen.findByText("Mobile Banking")).toBeTruthy();
    expect(screen.getByText("Transfer directly from your bank account")).toBeTruthy();
  });

  it("renders the TrueMoney payment method option", async () => {
    const screen = render(<WalletScreen />);

    expect(await screen.findByText("TrueMoney")).toBeTruthy();
    expect(screen.getByText("Top up with the mobile number linked to your TrueMoney Wallet")).toBeTruthy();
  });

  it("renders the PromptPay payment method option", async () => {
    const screen = render(<WalletScreen />);

    expect(await screen.findByText("PromptPay")).toBeTruthy();
    expect(screen.getByText("Pay by scanning a generated PromptPay QR code")).toBeTruthy();
  });

  it("renders payment methods in the requested order", async () => {
    const screen = render(<WalletScreen />);

    await screen.findByText("PromptPay");

    const labels = screen.getAllByText(/^(PromptPay|Mobile Banking|TrueMoney|Gift Voucher)$/).map((node) =>
      Array.isArray(node.props.children) ? node.props.children.join("") : String(node.props.children)
    );

    expect(labels).toEqual(["PromptPay", "Mobile Banking", "TrueMoney", "Gift Voucher"]);
  });

  it("opens bank selection modal when Mobile Banking is selected and Top up now is pressed", async () => {
    const screen = render(<WalletScreen />);

    await screen.findByText("฿24.50");

    fireEvent.press(screen.getByLabelText("Select ฿10.00"));
    fireEvent.press(screen.getByLabelText("Select Mobile Banking"));
    fireEvent.press(screen.getByText("Top up now"));

    expect(screen.getByText("Select your bank")).toBeTruthy();
    expect(screen.getByText("KBank")).toBeTruthy();
    expect(screen.getByText("SCB")).toBeTruthy();
    expect(screen.getByText("TTB")).toBeTruthy();
    expect(screen.getByText("BAY")).toBeTruthy();
    expect(screen.queryByText("TMB")).toBeNull();
  });

  it("generates a demo mobile number for the TrueMoney top-up flow", async () => {
    const screen = render(<WalletScreen />);

    await screen.findByText("฿24.50");

    fireEvent.press(screen.getByLabelText("Select ฿10.00"));
    fireEvent.press(screen.getByLabelText("Select TrueMoney"));
    fireEvent.press(screen.getByText("Top up now"));

    expect(screen.getByText("TrueMoney mobile number")).toBeTruthy();
    expect(screen.getByText("Tap to generate a mobile number")).toBeTruthy();

    fireEvent.press(screen.getByLabelText("Generate TrueMoney mobile number"));

    expect(screen.queryByText("Tap to generate a mobile number")).toBeNull();
    expect(screen.getByText(/^(06|08|09)\d{8}$/)).toBeTruthy();
  });

  it("shows a generated QR code for the PromptPay top-up flow", async () => {
    const screen = render(<WalletScreen />);

    await screen.findByText("฿24.50");

    fireEvent.press(screen.getByLabelText("Select ฿10.00"));
    fireEvent.press(screen.getByLabelText("Select PromptPay"));
    fireEvent.press(screen.getByText("Top up now"));

    expect(screen.getByText("PromptPay QR code")).toBeTruthy();
    expect(screen.getByLabelText("Generated PromptPay QR code")).toBeTruthy();
    expect(screen.getByText(/^Demo QR payload: PROMPTPAY\|10\.00\|\d{10}$/)).toBeTruthy();
  });

  it("navigates to unlock from the wallet CTA", async () => {
    const screen = render(<WalletScreen />);

    await screen.findByText("฿24.50");

    fireEvent.press(screen.getByText("Unlock a bike to start riding"));

    expect(push).toHaveBeenCalledWith({
      pathname: "/unlock/[id]",
      params: { id: "DEMO-BIKE" }
    });
  });

  it("renders transaction amounts with positive and negative styling prefixes", async () => {
    const screen = render(<WalletScreen />);

    await screen.findByText("Ride refund");

    expect(screen.getByText("+฿2.10")).toBeTruthy();
    expect(screen.getByText("-฿4.20")).toBeTruthy();
  });

  it("shows a wallet error state when loading fails", async () => {
    jest.mocked(configuredWalletService.getWallet).mockRejectedValueOnce(new Error("Wallet service offline"));

    const screen = render(<WalletScreen />);

    expect(await screen.findByText("Wallet unavailable")).toBeTruthy();
    expect(screen.getByText("Wallet service offline")).toBeTruthy();
  });

  it("cancels the mobile-banking confirmation flow before a bank is selected", async () => {
    const screen = render(<WalletScreen />);

    await screen.findByText("฿24.50");

    fireEvent.press(screen.getByLabelText("Select ฿10.00"));
    fireEvent.press(screen.getByLabelText("Select Mobile Banking"));
    fireEvent.press(screen.getByText("Top up now"));

    expect(screen.getByText("Select your bank")).toBeTruthy();

    fireEvent.press(screen.getByText("Continue"));
    expect(screen.getByText("Select your bank")).toBeTruthy();

    fireEvent.press(screen.getByText("Cancel"));
    await waitFor(() => {
      expect(screen.queryByText("Select your bank")).toBeNull();
    });
  });

  it("completes a mobile-banking top-up after choosing a bank", async () => {
    const screen = render(<WalletScreen />);

    await screen.findByText("฿24.50");

    fireEvent.press(screen.getByLabelText("Select ฿20.00"));
    fireEvent.press(screen.getByLabelText("Select Mobile Banking"));
    fireEvent.press(screen.getByText("Top up now"));
    fireEvent.press(screen.getByLabelText("Select KBank"));
    fireEvent.press(screen.getByText("Continue"));

    expect(screen.getByText("Confirm top-up")).toBeTruthy();
    expect(screen.getByText("KBank")).toBeTruthy();

    fireEvent.press(screen.getByText("Confirm & pay"));
    await settleTopUpFlow();

    expect(await screen.findByText("Top-up successful!")).toBeTruthy();
    expect(configuredWalletService.applyTopUp).toHaveBeenCalledWith({
      amount: 20,
      methodLabel: "Mobile Banking",
      title: "Wallet Top-up"
    });

    expect(screen.getByText("Payment successful!")).toBeTruthy();
    fireEvent.press(screen.getByText("Done"));
    await waitFor(() => {
      expect(screen.queryByText("Payment successful!")).toBeNull();
    });
  });

  it("prevents confirming a TrueMoney top-up until a number is generated", async () => {
    const screen = render(<WalletScreen />);

    await screen.findByText("฿24.50");

    fireEvent.press(screen.getByLabelText("Select ฿5.00"));
    fireEvent.press(screen.getByLabelText("Select TrueMoney"));
    fireEvent.press(screen.getByText("Top up now"));
    fireEvent.press(screen.getByText("Confirm & pay"));

    expect(configuredWalletService.applyTopUp).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("Generate TrueMoney mobile number"));
    fireEvent.press(screen.getByText("Confirm & pay"));
    await settleTopUpFlow();

    expect(configuredWalletService.applyTopUp).toHaveBeenCalledWith({
      amount: 5,
      methodLabel: "TrueMoney",
      title: "Wallet Top-up"
    });
  });

  it("redeems a voucher successfully and supports resetting the flow", async () => {
    const screen = render(<WalletScreen />);

    await screen.findByText("฿24.50");

    fireEvent.press(screen.getByLabelText("Select ฿50.00"));
    fireEvent.press(screen.getByLabelText("Select Gift Voucher"));
    fireEvent.press(screen.getByText("Top up now"));

    expect(screen.getAllByText("Redeem voucher").length).toBeGreaterThanOrEqual(2);

    fireEvent.press(screen.getAllByText("Redeem voucher")[1]!);
    expect(configuredWalletService.applyTopUp).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText("Tap to generate a code"));
    fireEvent.press(screen.getAllByText("Redeem voucher")[1]!);
    await settleTopUpFlow();

    expect(configuredWalletService.applyTopUp).toHaveBeenCalledWith({
      amount: 50,
      methodLabel: "Gift Voucher",
      title: "Voucher Credit"
    });
    expect(await screen.findByText("Top-up successful!")).toBeTruthy();

    fireEvent.press(screen.getByText("Done"));
    await waitFor(() => {
      expect(screen.queryByText("Payment successful!")).toBeNull();
    });

    fireEvent.press(screen.getByText("Start over"));
    expect(screen.queryByText("Top-up successful!")).toBeNull();
  });

  it("surfaces top-up failures from the wallet service", async () => {
    jest.mocked(configuredWalletService.applyTopUp).mockRejectedValueOnce(new Error("Gateway unavailable"));

    const screen = render(<WalletScreen />);

    await screen.findByText("฿24.50");

    fireEvent.press(screen.getByLabelText("Select ฿10.00"));
    fireEvent.press(screen.getByLabelText("Select PromptPay"));
    fireEvent.press(screen.getByText("Top up now"));
    fireEvent.press(screen.getByText("Confirm & pay"));
    await settleTopUpFlow();

    expect(await screen.findByText("Top-up failed")).toBeTruthy();
    expect(screen.getByText("Gateway unavailable")).toBeTruthy();
  });
});
