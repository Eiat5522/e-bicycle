import { colors } from "@/theme/tokens";

export function getBikeMarkerColor(
  status: string,
  isSelected: boolean,
  isOwnedByCurrentUser: boolean
) {
  if (status === "maintenance") {
    return colors.danger;
  }

  if (status === "in_use") {
    return isOwnedByCurrentUser ? colors.yellow : colors.danger;
  }

  if (isSelected) {
    return colors.coral;
  }

  return colors.teal;
}

export function getBikeStatusLabel(status: string) {
  if (status === "in_use") {
    return "In Use";
  }

  if (status === "available") {
    return "Available";
  }

  return status;
}
