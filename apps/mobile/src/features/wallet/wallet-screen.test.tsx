import { render } from "@testing-library/react-native";

import { WalletScreen } from "./wallet-screen";

describe("WalletScreen", () => {
  it("renders wallet content from the mock API package", () => {
    const screen = render(<WalletScreen />);

    expect(screen.getByText("Wallet")).toBeTruthy();
    expect(screen.getByText("$24.50")).toBeTruthy();
  });
});
