import { bankLogoMap, getBankLogo } from "./bank-logo-map";

describe("bank-logo-map", () => {
  it("exposes bundled sources for each supported wallet logo", () => {
    expect(getBankLogo("PromptPay")).toBe(bankLogoMap.PromptPay);
    expect(getBankLogo("TrueMoney")).toBe(bankLogoMap.TrueMoney);
    expect(getBankLogo("BAY")).toBe(bankLogoMap.BAY);
    expect(getBankLogo("SCB")).toBe(bankLogoMap.SCB);
    expect(getBankLogo("KBANK")).toBe(bankLogoMap.KBANK);
    expect(getBankLogo("KTB")).toBe(bankLogoMap.KTB);
    expect(getBankLogo("BBL")).toBe(bankLogoMap.BBL);
  });

  it("supports both TMB and TTB keys for the bundled TMBThanachart logo", () => {
    expect(getBankLogo("TMB")).toBe(bankLogoMap.TMB);
    expect(getBankLogo("TTB")).toBe(bankLogoMap.TTB);
    expect(bankLogoMap.TMB).toBe(bankLogoMap.TTB);
  });
});
