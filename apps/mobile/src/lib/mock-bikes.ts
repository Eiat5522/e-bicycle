import type { NearbyBikesResult } from "@glide/shared";

export const mockNearbyBikes: NearbyBikesResult = {
  serverTime: new Date().toISOString(),
  searchCenter: { latitude: 13.7173889, longitude: 100.5471253 },
  bikes: [
    {
      id: "19308",
      model: "Glide Pro X",
      location: "Punnawithi Station",
      pricingLabel: "$1.20 / 10 min",
      estimatedRangeKm: 64,
      topSpeedKmh: 25,
      status: "available",
      coordinates: { latitude: 13.7182, longitude: 100.5468 },
      lastReportedAt: new Date().toISOString()
    },
    {
      id: "19311",
      model: "Glide City",
      location: "Sukhumvit 101/1",
      pricingLabel: "$0.90 / 10 min",
      estimatedRangeKm: 42,
      topSpeedKmh: 22,
      status: "reserved",
      coordinates: { latitude: 13.7139, longitude: 100.5505 },
      lastReportedAt: new Date().toISOString()
    },
    {
      id: "19322",
      model: "Glide Lite",
      location: "Bang Chak Market",
      pricingLabel: "$0.80 / 10 min",
      estimatedRangeKm: 18,
      topSpeedKmh: 20,
      status: "maintenance",
      coordinates: { latitude: 13.7214, longitude: 100.5531 },
      lastReportedAt: new Date().toISOString()
    }
  ]
};
