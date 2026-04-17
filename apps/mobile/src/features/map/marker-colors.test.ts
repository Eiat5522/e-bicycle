import { colors } from "@/theme/tokens";

import { getBikeMarkerColor, getBikeStatusLabel } from "./marker-colors";

describe("marker-colors", () => {
  it("uses the rentable color for available bikes", () => {
    expect(getBikeMarkerColor("available", false)).toBe(colors.teal);
  });

  it("uses the active-session color for in-use bikes", () => {
    expect(getBikeMarkerColor("in_use", false)).toBe(colors.yellow);
  });

  it("keeps the selected color distinct from bike status", () => {
    expect(getBikeMarkerColor("available", true)).toBe(colors.coral);
    expect(getBikeMarkerColor("in_use", true)).toBe(colors.coral);
  });

  it("formats nearby bike status labels for map text", () => {
    expect(getBikeStatusLabel("available")).toBe("Available for rental");
    expect(getBikeStatusLabel("in_use")).toBe("Active session");
  });
});
