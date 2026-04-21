import {
  calculateBillableMinutes,
  calculateRideRevenue
} from "../src/fare";

describe("fare calculation", () => {
  it("rounds partial ride durations up to the next billable minute", () => {
    expect(calculateBillableMinutes(0)).toBe(0);
    expect(calculateBillableMinutes(60)).toBe(1);
    expect(calculateBillableMinutes(61)).toBe(2);
  });

  it("calculates ride revenue from billable minutes and rate per minute", () => {
    expect(calculateRideRevenue({ durationSec: 750, ratePerMinute: 0.09 })).toBeCloseTo(1.17, 2);
  });

  it("rejects negative rates", () => {
    expect(() => calculateRideRevenue({ durationSec: 60, ratePerMinute: -0.01 })).toThrow(
      "Rate per minute must be zero or greater."
    );
  });
});
