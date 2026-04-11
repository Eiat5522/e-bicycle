import { render } from "@testing-library/react-native";

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
    expect(await screen.findByText("$24.50")).toBeTruthy();
  });
});
