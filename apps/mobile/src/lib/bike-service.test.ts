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
      delete env.EXPO_PUBLIC_BIKE_DATA_SOURCE;
    }
  });

  it("queries Supabase bikes and maps nearby rows into the shared bike shape", async () => {
    const order = jest.fn().mockResolvedValue({
      data: [
        {
          id: "G-104",
          model: "Glide Pro X",
          image_url: "https://cdn.example.com/bikes/G-104.webp",
          ride_class: "Pro",
          estimated_range_km: 45,
          top_speed_kmh: 25,
          pricing_label: "$1.20 / 10 min",
          rate_per_minute: 0.12,
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
          image_url: null,
          ride_class: null,
          estimated_range_km: 20,
          top_speed_kmh: 18,
          pricing_label: "$0.50 / 10 min",
          rate_per_minute: 0.05,
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

    const { configuredBikeService } = jest.requireActual("./bike-service") as typeof import("./bike-service");

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
        imageUrl: "https://cdn.example.com/bikes/G-104.webp",
        model: "Glide Pro X",
        rideClass: "Pro",
        pricingLabel: "$1.20 / 10 min",
        ratePerMinute: 0.12,
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

    const { configuredBikeService } = jest.requireActual("./bike-service") as typeof import("./bike-service");
    const result = await configuredBikeService.getById("G-104");

    expect(result).toEqual(
      expect.objectContaining({
        id: "G-104",
        imageUrl: expect.stringContaining("Electric_Bicycle"),
        model: "Glide Pro X"
      })
    );
  });

  it("falls back to the mock bike list when Supabase times out", async () => {
    const order = jest.fn().mockResolvedValue({
      data: null,
      error: {
        message: "Network request timed out"
      }
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

    const { configuredBikeService } = jest.requireActual("./bike-service") as typeof import("./bike-service");
    const result = await configuredBikeService.listNearby({
      latitude: 13.7563,
      longitude: 100.5018,
      radiusMeters: 1500,
      limit: 10
    });

    expect(result.bikes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "G-104",
          model: "Glide Pro X"
        })
      ])
    );
  });

  it("prefers Supabase over the HTTP bike API unless the API is explicitly selected", async () => {
    const env = (
      globalThis as typeof globalThis & {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env;

    if (env) {
      env.EXPO_PUBLIC_API_BASE_URL = "http://172.20.10.6:3000/api";
    }

    const order = jest.fn().mockResolvedValue({
      data: [
        {
          id: "G-104",
          model: "Glide Pro X",
          image_url: null,
          ride_class: "Pro",
          estimated_range_km: 45,
          top_speed_kmh: 25,
          pricing_label: "$1.20 / 10 min",
          rate_per_minute: 0.12,
          status: "available",
          location: "Siam Square",
          latitude: 13.7466,
          longitude: 100.5328,
          last_reported_at: "2026-04-06T08:55:00Z",
          created_at: "2026-04-06T08:55:00Z",
          updated_at: "2026-04-06T08:55:00Z"
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

    const fetchSpy = jest.fn();
    globalThis.fetch = fetchSpy as typeof globalThis.fetch;

    const { configuredBikeService } = jest.requireActual("./bike-service") as typeof import("./bike-service");

    await configuredBikeService.listNearby({
      latitude: 13.7563,
      longitude: 100.5018,
      radiusMeters: 1500,
      limit: 10
    });

    expect(from).toHaveBeenCalledWith("bikes");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses the HTTP bike API when explicitly selected", async () => {
    const env = (
      globalThis as typeof globalThis & {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env;

    if (env) {
      env.EXPO_PUBLIC_API_BASE_URL = "http://172.20.10.6:3000/api";
      env.EXPO_PUBLIC_BIKE_DATA_SOURCE = "api";
    }

    jest.doMock("./supabase", () => ({
      hasSupabaseConfig: true,
      supabase: {
        from: jest.fn()
      }
    }));

    const fetchSpy = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        bikes: [],
        serverTime: "2026-04-12T00:00:00.000Z",
        searchCenter: {
          latitude: 13.7563,
          longitude: 100.5018
        }
      })
    });
    globalThis.fetch = fetchSpy as typeof globalThis.fetch;

    const { configuredBikeService } = jest.requireActual("./bike-service") as typeof import("./bike-service");

    await configuredBikeService.listNearby({
      latitude: 13.7563,
      longitude: 100.5018,
      radiusMeters: 1500,
      limit: 10
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "http://172.20.10.6:3000/api/bikes/nearby?lat=13.7563&lng=100.5018&radius=1500&limit=10"
    );
  });

  it("warns and falls back when the API source is selected without a base URL", async () => {
    const env = (
      globalThis as typeof globalThis & {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env;

    if (env) {
      env.EXPO_PUBLIC_BIKE_DATA_SOURCE = "api";
    }

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const order = jest.fn().mockResolvedValue({
      data: [
        {
          id: "G-104",
          model: "Glide Pro X",
          image_url: null,
          ride_class: "Pro",
          estimated_range_km: 45,
          top_speed_kmh: 25,
          pricing_label: "$1.20 / 10 min",
          rate_per_minute: 0.12,
          status: "available",
          location: "Siam Square",
          latitude: 13.7466,
          longitude: 100.5328,
          last_reported_at: "2026-04-06T08:55:00Z",
          created_at: "2026-04-06T08:55:00Z",
          updated_at: "2026-04-06T08:55:00Z"
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

    const fetchSpy = jest.fn();
    globalThis.fetch = fetchSpy as typeof globalThis.fetch;

    const { configuredBikeService } = jest.requireActual("./bike-service") as typeof import("./bike-service");

    await configuredBikeService.listNearby({
      latitude: 13.7563,
      longitude: 100.5018,
      radiusMeters: 1500,
      limit: 10
    });

    expect(warnSpy).toHaveBeenCalledWith(
      "EXPO_PUBLIC_BIKE_DATA_SOURCE is set to \"api\" but EXPO_PUBLIC_API_BASE_URL is missing. Falling back to the next available bike data source."
    );
    expect(from).toHaveBeenCalledWith("bikes");
    expect(fetchSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("returns undefined when Supabase cannot find a bike by id", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: null
    });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn(() => ({
      select
    }));

    jest.doMock("./supabase", () => ({
      hasSupabaseConfig: true,
      supabase: {
        from
      }
    }));

    const { configuredBikeService } = jest.requireActual("./bike-service") as typeof import("./bike-service");

    await expect(configuredBikeService.getById("missing-bike")).resolves.toBeUndefined();
  });

  it("falls back to the mock bike by id on recoverable Supabase failures", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: null,
      error: {
        message: "Network request failed"
      }
    });
    const eq = jest.fn().mockReturnValue({ maybeSingle });
    const select = jest.fn().mockReturnValue({ eq });
    const from = jest.fn(() => ({
      select
    }));

    jest.doMock("./supabase", () => ({
      hasSupabaseConfig: true,
      supabase: {
        from
      }
    }));

    const { configuredBikeService } = jest.requireActual("./bike-service") as typeof import("./bike-service");
    const bike = await configuredBikeService.getById("G-104");

    expect(bike).toEqual(
      expect.objectContaining({
        id: "G-104",
        model: "Glide Pro X"
      })
    );
  });

  it("uses the mock bike source when explicitly configured", async () => {
    const env = (
      globalThis as typeof globalThis & {
        process?: { env?: Record<string, string | undefined> };
      }
    ).process?.env;

    if (env) {
      env.EXPO_PUBLIC_BIKE_DATA_SOURCE = "mock";
    }

    jest.doMock("./supabase", () => ({
      hasSupabaseConfig: true,
      supabase: {
        from: jest.fn()
      }
    }));

    const fetchSpy = jest.fn();
    globalThis.fetch = fetchSpy as typeof globalThis.fetch;

    const { configuredBikeService } = jest.requireActual("./bike-service") as typeof import("./bike-service");
    const result = await configuredBikeService.listNearby({
      latitude: 13.7563,
      longitude: 100.5018,
      radiusMeters: 1500,
      limit: 10
    });

    expect(result.bikes.length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
