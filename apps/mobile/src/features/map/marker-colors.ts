import {
  getBikeStatusLabel as getCanonicalBikeStatusLabel,
  isBikeRentableStatus,
  type BikeStatus
} from "@glide/shared";

import { colors } from "@/theme/tokens";

export function getBikeMarkerColor(
  status: BikeStatus,
  isSelected: boolean,
  isOwnedByCurrentUser: boolean
) {
  if (status === "maintenance_required" || status === "out_of_service") {
    return colors.danger;
  }

  if (status === "returned_pending_inspection") {
    return colors.yellow;
  }

  if (status === "in_use") {
    return isOwnedByCurrentUser ? colors.yellow : colors.danger;
  }

  if (status === "reserved") {
    return colors.coral;
  }

  if (isSelected) {
    return colors.coral;
  }

  return isBikeRentableStatus(status) ? colors.teal : colors.yellow;
}

export function getBikeStatusLabel(status: BikeStatus) {
  return getCanonicalBikeStatusLabel(status);
}
