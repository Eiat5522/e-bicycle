import type { Coordinates } from "@glide/shared";

import {
  appendRoutePoint,
  createLiveRideSnapshot,
  createMockLiveRideRoute,
  getNearestDropoffZone
} from "./live-ride-tracker";

const start: Coordinates = { latitude: 13.7372, longitude: 100.5606 };
const nearDuplicate: Coordinates = { latitude: 13.73720001, longitude: 100.56060001 };
const nextPoint: Coordinates = { latitude: 13.7365, longitude: 100.5577 };

describe("live ride tracker calculations", () => {
  it("ignores tiny duplicate movements when appending route points", () => {
    const route = appendRoutePoint([start], nearDuplicate);

    expect(route).toEqual([start]);
  });

  it("appends meaningful movement and increases the ride distance", () => {
    const route = appendRoutePoint([start], nextPoint);
    const snapshot = createLiveRideSnapshot({
      bikeId: "G-205",
      startedAtMs: 1_000,
      nowMs: 61_000,
      ratePerMinute: 0.1846,
      route
    });

    expect(route).toHaveLength(2);
    expect(snapshot.distanceKm).toBeGreaterThan(0.2);
    expect(snapshot.durationSec).toBe(60);
    expect(snapshot.currentCost).toBe(0.18);
    expect(snapshot.checkpoints.map((checkpoint) => checkpoint.label)).toEqual([
      "Unlock",
      "Drop-off"
    ]);
  });

  it("creates deterministic mock fallback routes", () => {
    const firstRoute = createMockLiveRideRoute(start, 3);
    const secondRoute = createMockLiveRideRoute(start, 3);

    expect(firstRoute).toEqual(secondRoute);
    expect(firstRoute).toHaveLength(4);
    expect(firstRoute[0]).toEqual(start);
  });

  it("finds the nearest deterministic drop-off zone", () => {
    const dropoff = getNearestDropoffZone(start);

    expect(dropoff.label).toBe("Benjakitti Park");
    expect(dropoff.distanceKm).toBeGreaterThan(0);
  });
});
