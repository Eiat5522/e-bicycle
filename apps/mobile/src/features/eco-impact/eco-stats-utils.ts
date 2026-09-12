import type { RideHistoryItem, Wallet } from "@glide/shared";

import type { RewardMilestoneKey } from "@/lib/reward-milestones";

export interface RideStats {
  readonly totalRides: number;
  readonly totalDistanceKm: number;
  readonly totalCo2SavedKg: number;
  readonly totalDurationSec: number;
}

export interface EcoEquivalents {
  readonly treesEquivalent: number;
  readonly carTripsAvoided: number;
}

const CO2_KG_PER_TREE_PER_YEAR = 22;
const CO2_KG_PER_CAR_TRIP_BANGKOK = 2.3;

export function aggregateRideStats(rides: readonly RideHistoryItem[]): RideStats {
  let totalDistanceKm = 0;
  let totalCo2SavedKg = 0;
  let totalDurationSec = 0;

  for (const ride of rides) {
    totalDistanceKm += ride.distanceKm;
    totalCo2SavedKg += ride.co2SavedKg;
    totalDurationSec += ride.durationSec;
  }

  return {
    totalRides: rides.length,
    totalDistanceKm,
    totalCo2SavedKg,
    totalDurationSec
  };
}

export function formatTotalRideTime(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function computeEcoEquivalents(co2Kg: number): EcoEquivalents {
  const trees = co2Kg / CO2_KG_PER_TREE_PER_YEAR;
  const trips = co2Kg / CO2_KG_PER_CAR_TRIP_BANGKOK;

  return {
    treesEquivalent: Math.round(trees * 100) / 100,
    carTripsAvoided: Math.round(trips * 100) / 100
  };
}

export function getUnlockedMilestones(
  rides: readonly RideHistoryItem[],
  wallet: Wallet
): ReadonlySet<RewardMilestoneKey> {
  const unlocked = new Set<RewardMilestoneKey>();

  unlocked.add("signup");

  if (wallet.transactions.some((t) => t.type === "top_up")) {
    unlocked.add("first_wallet_top_up");
  }

  if (rides.length >= 1) {
    unlocked.add("first_ride");
  }

  if (rides.length >= 5) {
    unlocked.add("five_rides");
  }

  if (rides.length >= 10) {
    unlocked.add("ten_rides");
  }

  return unlocked;
}

function toBangkokDateString(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${isoString}`);
  }
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
}

function todayBangkokDateString(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
}

export function calculateStreakDays(rides: readonly RideHistoryItem[]): number {
  if (rides.length === 0) {
    return 0;
  }

  const uniqueDates = [
    ...new Set(rides.map((r) => toBangkokDateString(r.completedAt)))
  ].sort().reverse();

  const today = todayBangkokDateString();
  const todayMs = Date.parse(today + "T00:00:00Z");
  const yesterdayMs = todayMs - 86400000;
  const yesterday = new Date(yesterdayMs).toISOString().slice(0, 10);

  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevMs = Date.parse(uniqueDates[i - 1] + "T00:00:00Z");
    const currMs = Date.parse(uniqueDates[i] + "T00:00:00Z");
    if (prevMs - currMs === 86400000) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
