describe("configuredBikeService", () => {
  beforeEach(() => {
    jest.resetModules();
    const env = (
      globalThis as typeof globalThis & {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env;

    if (env) {
      delete env.EXPO_PUBLIC_API_BASE_URL;
    }
  });

  it("queries Supabase bikes and maps nearby rows into the shared bike shape", async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        {
          id: "G-104",
          model: "Glide Pro X",
          ride_class: "Pro",
          estimated_range_km: 45,
          top_speed_kmh: 25,
          pricing_label: "$1.20 / 10 min",
          status: "available",
          location: "Siam Square",
          latitude: 13.7466,
          longitude: 100.5328,
          last_reported_at: "2026-04-06T08:55:00Z",
          created_at: "2026-04-06T08:55:00Z",
          updated_at: "2026-04-06T08:55:00Z"
        },
        {
          id: "G-999",
          model: "Far Away",
          ride_class: null,
          estimated_range_km: 20,
          top_speed_kmh: 18,
          pricing_label: "$0.50 / 10 min",
          status: "maintenance",
          location: "Far Away",
          latitude: 14.2,
          longitude: 100.9,
          last_reported_at: "2026-04-06T08:00:00Z",
          created_at: "2026-04-06T08:00:00Z",
          updated_at: "2026-04-06T08:00:00Z"
        }
      ],
      error: null
    });

    const select = jest.fn(() => ({
      order
    }));
    const from = jest.fn(() => ({
      select
    }));

    jest.doMock("./supabase", () => ({
      hasSupabaseConfig: true,
      supabase: {
        from
      }
    }));

    const { configuredBikeService } = require("./bike-service") as typeof import("./bike-service");

    const result = await configuredBikeService.listNearby({
      latitude: 13.7563,
      longitude: 100.5018,
      radiusMeters: 5000,
      limit: 10
    });

    expect(from).toHaveBeenCalledWith("bikes");
    expect(select).toHaveBeenCalled();
    expect(order).toHaveBeenCalledWith("last_reported_at", { ascending: false });
    expect(result.searchCenter).toEqual({
      latitude: 13.7563,
      longitude: 100.5018
    });
    expect(result.bikes).toEqual([
      expect.objectContaining({
        id: "G-104",
        model: "Glide Pro X",
        rideClass: "Pro",
        pricingLabel: "$1.20 / 10 min",
        coordinates: {
          latitude: 13.7466,
          longitude: 100.5328
        }
      })
    ]);
  });

  it("falls back to the mock bike service when Supabase is not configured", async () => {
    jest.doMock("./supabase", () => ({
      hasSupabaseConfig: false,
      supabase: {
        from: jest.fn()
      }
    }));

    const { configuredBikeService } = require("./bike-service") as typeof import("./bike-service");
    const result = await configuredBikeService.getById("G-104");

    expect(result).toEqual(
      expect.objectContaining({
        id: "G-104",
        model: "Glide Pro X"
      })
    );
  });
});
