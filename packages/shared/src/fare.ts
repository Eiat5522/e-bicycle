export function calculateBillableMinutes(durationSec: number): number {
  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return 0;
  }

  return Math.ceil(durationSec / 60);
}

export function calculateRideRevenue(input: {
  readonly durationSec: number;
  readonly ratePerMinute: number;
}): number {
  if (!Number.isFinite(input.ratePerMinute) || input.ratePerMinute < 0) {
    throw new Error("Rate per minute must be zero or greater.");
  }

  const billableMinutes = calculateBillableMinutes(input.durationSec);
  return Math.round(billableMinutes * input.ratePerMinute * 100) / 100;
}
