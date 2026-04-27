import type { Coordinates } from "@glide/shared";

import {
  getWalkingRouteSummary,
  parseMapboxDirectionsResponse
} from "./mapbox-directions";

describe("parseMapboxDirectionsResponse", () => {
  it("returns a primary route and alternate routes from Mapbox directions", () => {
    const summary = parseMapboxDirectionsResponse({
      routes: [
        {
          distance: 820,
          duration: 615,
          legs: [{ summary: "Rama I Road" }],
          geometry: {
            coordinates: [
              [100.5018, 13.7563],
              [100.5328, 13.7466]
            ],
            type: "LineString"
          }
        },
        {
          distance: 910,
          duration: 702,
          legs: [{ summary: "Henri Dunant Road" }],
          geometry: {
            coordinates: [
              [100.5018, 13.7563],
              [100.5291, 13.7481]
            ],
            type: "LineString"
          }
        }
      ]
    });

    expect(summary.primaryRoute).toEqual(
      expect.objectContaining({
        distanceMeters: 820,
        durationSec: 615,
        label: "Rama I Road"
      })
    );
    expect(summary.alternateRoutes).toEqual([
      expect.objectContaining({
        distanceMeters: 910,
        durationSec: 702,
        label: "Henri Dunant Road"
      })
    ]);
  });

  it("keeps rendering valid data when Mapbox only returns one route", () => {
    const summary = parseMapboxDirectionsResponse({
      routes: [
        {
          distance: 540,
          duration: 420,
          legs: [{ summary: "Soi Sukhumvit 23" }]
        }
      ]
    });

    expect(summary.primaryRoute).toEqual(
      expect.objectContaining({
        distanceMeters: 540,
        durationSec: 420,
        label: "Soi Sukhumvit 23"
      })
    );
    expect(summary.alternateRoutes).toEqual([]);
  });
});

describe("getWalkingRouteSummary", () => {
  const origin: Coordinates = {
    latitude: 13.7563,
    longitude: 100.5018
  };
  const destination: Coordinates = {
    latitude: 13.7466,
    longitude: 100.5328
  };

  it("returns null when the request fails", async () => {
    const summary = await getWalkingRouteSummary({
      origin,
      destination,
      accessToken: "test-token",
      fetchImpl: jest.fn().mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ message: "Too many requests" }),
        text: jest.fn().mockResolvedValue("Too many requests")
      } as unknown as Response)
    });

    expect(summary).toBeNull();
  });
});
