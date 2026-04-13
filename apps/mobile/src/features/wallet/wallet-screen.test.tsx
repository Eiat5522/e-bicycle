import { fireEvent, render } from "@testing-library/react-native";

import { configuredWalletService } from "@/lib/wallet-service";

import { WalletScreen } from "./wallet-screen";

jest.mock("@/lib/wallet-service", () => ({
  configuredWalletService: {
    getWallet: jest.fn()
  }
}));

describe("WalletScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(configuredWalletService.getWallet).mockResolvedValue({
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
        }
      ]
    });
  });

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
});
