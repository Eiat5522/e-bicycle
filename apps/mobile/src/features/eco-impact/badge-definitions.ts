import { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { RewardMilestoneKey } from "@/lib/reward-milestones";

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export interface BadgeDefinition {
  readonly key: RewardMilestoneKey;
  readonly label: string;
  readonly description: string;
  readonly icon: IconName;
}

export const BADGE_DEFINITIONS: readonly BadgeDefinition[] = [
  {
    key: "signup",
    label: "Welcome Rider",
    description: "Joined Glide Bangkok",
    icon: "account-check-outline"
  },
  {
    key: "first_wallet_top_up",
    label: "First Top-up",
    description: "Loaded your wallet",
    icon: "wallet-plus-outline"
  },
  {
    key: "first_ride",
    label: "First Ride",
    description: "Completed your first trip",
    icon: "bike"
  },
  {
    key: "five_rides",
    label: "5 Rides",
    description: "Building a riding habit",
    icon: "medal-outline"
  },
  {
    key: "ten_rides",
    label: "10 Rides",
    description: "Legendary Glide rider",
    icon: "trophy-outline"
  },
];
