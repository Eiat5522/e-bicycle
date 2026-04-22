import {
  formatCurrency,
  formatDistanceKm,
  formatDuration
} from "../src/formatters";

describe("formatters", () => {
  it("formats currency in THB", () => {
    expect(formatCurrency(4.25)).toBe("฿4.25");
  });

  it("formats distances with one decimal place", () => {
    expect(formatDistanceKm(3.14)).toBe("3.1 km");
  });

  it("formats duration as hh:mm:ss", () => {
    expect(formatDuration(750)).toBe("00:12:30");
  });
});
