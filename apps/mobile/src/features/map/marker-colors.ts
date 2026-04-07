import type { Bike } from "@glide/shared";

import { colors } from "@/theme/tokens";

export function getBikeMarkerColor(status: Bike["status"], isSelected: boolean) {
  if (isSelected) {
    return colors.markerSelected;
  }

  if (status === "reserved") {
    return colors.markerReserved;
  }

  if (status === "maintenance") {
    return colors.markerMaintenance;
  }

  return colors.markerAvailable;
}

export function getBikeStatusLabel(status: Bike["status"]) {
  if (status === "in_use") {
    return "Active session";
  }

  if (status === "available") {
    return "Available for rental";
  }

  if (status === "reserved") {
    return "Reserved";
  }

  return "Maintenance";
}
