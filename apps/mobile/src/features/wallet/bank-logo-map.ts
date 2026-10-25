import type { ImageSourcePropType } from "react-native";

export type SupportedBankLogo =
  | "PromptPay"
  | "TrueMoney"
  | "BAY"
  | "SCB"
  | "KBANK"
  | "KTB"
  | "BBL"
  | "TMB"
  | "TTB";

// The upstream package publishes TMBThanachart under TTB, so we support both keys locally.
const tmbThanachartLogo = require("../../../assets/images/banks/TMB.png");

export const bankLogoMap: Record<SupportedBankLogo, ImageSourcePropType> = {
  PromptPay: require("../../../assets/images/banks/PromptPay.png"),
  TrueMoney: require("../../../assets/images/banks/TrueMoney.png"),
  BAY: require("../../../assets/images/banks/BAY.png"),
  SCB: require("../../../assets/images/banks/SCB.png"),
  KBANK: require("../../../assets/images/banks/KBANK.png"),
  KTB: require("../../../assets/images/banks/KTB.png"),
  BBL: require("../../../assets/images/banks/BBL.png"),
  TMB: tmbThanachartLogo,
  TTB: tmbThanachartLogo
};

export function getBankLogo(bank: SupportedBankLogo) {
  return bankLogoMap[bank];
}
