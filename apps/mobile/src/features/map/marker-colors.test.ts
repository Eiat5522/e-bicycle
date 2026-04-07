import { colors } from "@/theme/tokens";

import { getBikeMarkerColor, getBikeStatusLabel } from "./marker-colors";

describe("marker-colors", () => {
  it("uses the rentable color for available bikes", () => {
    expect(getBikeMarkerColor("available", false)).toBe(colors.markerAvailable);
  });

  it("uses the reserved color for reserved bikes", () => {
    expect(getBikeMarkerColor("reserved", false)).toBe(colors.markerReserved);
  });

  it("uses the maintenance color for maintenance bikes", () => {
    expect(getBikeMarkerColor("maintenance", false)).toBe(colors.markerMaintenance);
  });

  it("keeps the selected color distinct from bike status", () => {
    expect(getBikeMarkerColor("available", true)).toBe(colors.markerSelected);
    expect(getBikeMarkerColor("in_use", true)).toBe(colors.markerSelected);
  });

  it("formats nearby bike status labels for map text", () => {
    expect(getBikeStatusLabel("available")).toBe("Available for rental");
    expect(getBikeStatusLabel("in_use")).toBe("Active session");
    expect(getBikeStatusLabel("reserved")).toBe("Reserved");
    expect(getBikeStatusLabel("maintenance")).toBe("Maintenance");
  });
});
