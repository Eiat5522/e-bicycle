export type WalletTransactionPresentation = {
  readonly iconName:
    | "backup-restore"
    | "bike-fast"
    | "star-four-points-outline"
    | "ticket-percent-outline"
    | "wallet-plus-outline";
  readonly label: string;
};

const WALLET_TRANSACTION_PRESENTATIONS: Record<string, WalletTransactionPresentation> = {
  top_up: {
    iconName: "wallet-plus-outline",
    label: "Top-up"
  },
  ride: {
    iconName: "bike-fast",
    label: "Ride charge"
  },
  ride_charge: {
    iconName: "bike-fast",
    label: "Ride charge"
  },
  refund: {
    iconName: "backup-restore",
    label: "Refund"
  },
  reward: {
    iconName: "star-four-points-outline",
    label: "Reward"
  },
  voucher_credit: {
    iconName: "ticket-percent-outline",
    label: "Voucher credit"
  }
};

function toTitleCase(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function getWalletTransactionPresentation(type: string): WalletTransactionPresentation {
  return (
    WALLET_TRANSACTION_PRESENTATIONS[type] ?? {
      iconName: "star-four-points-outline",
      label: toTitleCase(type)
    }
  );
}
