import { colors } from "@/theme/tokens";

import { getBikeMarkerColor, getBikeStatusLabel } from "./marker-colors";

describe("marker-colors", () => {
  it("uses the rentable color for available bikes", () => {
    expect(getBikeMarkerColor("available", false, false)).toBe(colors.teal);
  });

  it("uses the active-session color for bikes owned by the current rider", () => {
    expect(getBikeMarkerColor("in_use", false, true)).toBe(colors.yellow);
  });

  it("uses a warning color for bikes that are active for another rider", () => {
    expect(getBikeMarkerColor("in_use", true, false)).toBe(colors.danger);
  });

  it("uses the warning color for maintenance bikes", () => {
    expect(getBikeMarkerColor("maintenance", false, false)).toBe(colors.danger);
  });

  it("keeps the selected color distinct from rentable bike status", () => {
    expect(getBikeMarkerColor("available", true, false)).toBe(colors.coral);
  });

  it("formats nearby bike status labels for map text", () => {
    expect(getBikeStatusLabel("available")).toBe("Available");
    expect(getBikeStatusLabel("in_use")).toBe("In Use");
  });
});
