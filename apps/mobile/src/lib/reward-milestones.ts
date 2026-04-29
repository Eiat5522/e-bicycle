import type { WalletTransaction } from "@glide/shared";

export type RewardMilestoneKey =
  | "signup"
  | "first_wallet_top_up"
  | "first_ride"
  | "five_rides"
  | "ten_rides";

type MilestoneCelebration = {
  readonly headline: string;
  readonly message: string;
  readonly confetti: string;
};

const MILESTONE_CELEBRATIONS: Record<RewardMilestoneKey, MilestoneCelebration> = {
  signup: {
    headline: "Welcome reward unlocked!",
    message: "You earned your signup milestone.",
    confetti: "🎉"
  },
  first_wallet_top_up: {
    headline: "First top-up milestone complete!",
    message: "Wallet top-ups add Baht balance. Milestones award points.",
    confetti: "🎉🎊"
  },
  first_ride: {
    headline: "First ride milestone complete!",
    message: "Amazing start — you just unlocked your first ride reward.",
    confetti: "🎊✨"
  },
  five_rides: {
    headline: "5 rides milestone complete!",
    message: "Consistency unlocked. You're building a riding streak.",
    confetti: "🎆🎊✨"
  },
  ten_rides: {
    headline: "10 rides milestone complete!",
    message: "Legendary! You unlocked the most epic reward tier.",
    confetti: "🎇🎆🎊✨"
  }
};

const rewardMilestoneKeys = new Set<RewardMilestoneKey>([
  "signup",
  "first_wallet_top_up",
  "first_ride",
  "five_rides",
  "ten_rides"
]);

export function parseRewardMilestoneKey(rawValue: string | null | undefined): RewardMilestoneKey | null {
  if (!rawValue) {
    return null;
  }

  return rewardMilestoneKeys.has(rawValue as RewardMilestoneKey)
    ? (rawValue as RewardMilestoneKey)
    : null;
}

export function getRewardMilestoneFromTransaction(transaction: WalletTransaction): RewardMilestoneKey | null {
  if (transaction.type !== "reward") {
    return null;
  }

  const match = /Milestone key:\s*([a-z_]+)/i.exec(transaction.subtitle);
  return parseRewardMilestoneKey(match?.[1]);
}

export function isRecentRewardTransaction(
  transaction: WalletTransaction,
  now = Date.now(),
  withinMs = 3 * 60 * 1000
) {
  const timestamp = Date.parse(transaction.timestamp);

  if (!Number.isFinite(timestamp)) {
    return false;
  }

  return Math.abs(now - timestamp) <= withinMs;
}

export function findRecentRewardMilestone(
  transactions: readonly WalletTransaction[],
  allowedMilestones?: readonly RewardMilestoneKey[]
): RewardMilestoneKey | null {
  const allowed = allowedMilestones ? new Set(allowedMilestones) : null;

  for (const transaction of transactions) {
    if (!isRecentRewardTransaction(transaction)) {
      continue;
    }

    const milestoneKey = getRewardMilestoneFromTransaction(transaction);
    if (!milestoneKey) {
      continue;
    }

    if (allowed && !allowed.has(milestoneKey)) {
      continue;
    }

    return milestoneKey;
  }

  return null;
}

export function getRewardMilestoneCelebration(milestoneKey: RewardMilestoneKey): MilestoneCelebration {
  return MILESTONE_CELEBRATIONS[milestoneKey];
}
