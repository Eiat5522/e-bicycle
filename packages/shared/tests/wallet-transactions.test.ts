import { getWalletTransactionPresentation } from "../src/wallet-transactions";

describe("getWalletTransactionPresentation", () => {
  it("maps live ride charge transactions to a ride icon and label", () => {
    expect(getWalletTransactionPresentation("ride_charge")).toEqual({
      iconName: "bike-fast",
      label: "Ride charge"
    });
  });

  it("maps live voucher credit transactions to a voucher icon and label", () => {
    expect(getWalletTransactionPresentation("voucher_credit")).toEqual({
      iconName: "ticket-percent-outline",
      label: "Voucher credit"
    });
  });

  it("keeps unknown transaction types readable", () => {
    expect(getWalletTransactionPresentation("bike_repair_credit")).toEqual({
      iconName: "star-four-points-outline",
      label: "Bike Repair Credit"
    });
  });
});
