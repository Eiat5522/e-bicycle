import type { WalletTransaction } from "@glide/shared";

import {
  findRecentRewardMilestone,
  getRewardMilestoneCelebration,
  getRewardMilestoneFromTransaction,
  isRecentRewardTransaction,
  parseRewardMilestoneKey
} from "./reward-milestones";

function walletTransaction(
  overrides: Partial<WalletTransaction> = {}
): WalletTransaction {
  return {
    id: "txn-reward",
    type: "reward",
    title: "Milestone unlocked",
    subtitle: "Milestone key: first_ride",
    amount: 20,
    timestamp: "2026-04-22T04:00:00.000Z",
    ...overrides
  };
}

describe("reward milestones", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-04-22T04:02:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("recognizes milestone keys from wallet reward subtitles without depending on letter casing", () => {
    expect(
      getRewardMilestoneFromTransaction(
        walletTransaction({ subtitle: "Reward posted. Milestone key: FIRST_RIDE" })
      )
    ).toBe("first_ride");
  });

  it("ignores non-reward transactions and unknown milestone keys", () => {
    expect(
      getRewardMilestoneFromTransaction(
        walletTransaction({ type: "top_up", subtitle: "Milestone key: first_wallet_top_up" })
      )
    ).toBeNull();
    expect(parseRewardMilestoneKey("bike_rental_bonus")).toBeNull();
  });

  it("treats reward transactions outside the recent window as ineligible", () => {
    expect(
      isRecentRewardTransaction(
        walletTransaction({ timestamp: "2026-04-22T03:58:59.000Z" }),
        Date.now()
      )
    ).toBe(false);
  });

  it("returns the first recent milestone that is explicitly allowed", () => {
    const transactions = [
      walletTransaction({
        id: "txn-signup",
        subtitle: "Milestone key: signup",
        timestamp: "2026-04-22T04:01:00.000Z"
      }),
      walletTransaction({
        id: "txn-top-up",
        subtitle: "Milestone key: first_wallet_top_up",
        timestamp: "2026-04-22T04:00:30.000Z"
      })
    ];

    expect(findRecentRewardMilestone(transactions, ["first_wallet_top_up"])).toBe(
      "first_wallet_top_up"
    );
  });

  it("provides customer-facing copy for every recognized milestone key", () => {
    for (const milestoneKey of [
      "signup",
      "first_wallet_top_up",
      "first_ride",
      "five_rides",
      "ten_rides"
    ] as const) {
      expect(getRewardMilestoneCelebration(milestoneKey).headline).toEqual(
        expect.stringContaining("!")
      );
      expect(getRewardMilestoneCelebration(milestoneKey).message.length).toBeGreaterThan(10);
    }
  });
});
