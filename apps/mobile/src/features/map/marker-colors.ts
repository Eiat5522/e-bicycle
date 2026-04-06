import { colors } from "@/theme/tokens";

export function getBikeMarkerColor(status: string, isSelected: boolean) {
  if (isSelected) {
    return colors.coral;
  }

  if (status === "in_use") {
    return colors.yellow;
  }

  return colors.teal;
}

export function getBikeStatusLabel(status: string) {
  if (status === "in_use") {
    return "Active session";
  }

  if (status === "available") {
    return "Available for rental";
  }

  return status;
}
