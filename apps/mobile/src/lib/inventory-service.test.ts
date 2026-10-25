describe("versioned inventory", () => {
  beforeEach(() => { jest.resetModules(); delete process.env.EXPO_PUBLIC_API_BASE_URL; delete process.env.EXPO_PUBLIC_BIKE_DATA_SOURCE; });
  function setup(rows: unknown[], error: unknown = null) {
    jest.resetModules();
    const order = jest.fn().mockResolvedValue({ data: rows, error });
    const maybeSingle = jest.fn().mockResolvedValue({ data: rows[0] ?? null, error });
    const from = jest.fn(() => ({ select: () => ({ order, eq: () => ({ maybeSingle }) }) }));
    jest.doMock("./supabase", () => ({ hasSupabaseConfig: true, supabase: { from } }));
    const module = jest.requireActual("./bike-service") as typeof import("./bike-service") & {
      configuredInventoryService: { listNearby: (q: unknown) => Promise<any>; getById: (id: string) => Promise<any> };
    };
    return module.configuredInventoryService;
  }
  const canonical = { id: "canonical", model: "Model", status: "ready_to_rent", latitude: 13.75, longitude: 100.5, location: "Station", estimated_range_km: 20, top_speed_kmh: 25, pricing_label: "Price", rate_per_minute: 1, last_reported_at: "time" };
  const query = { latitude: 13.75, longitude: 100.5, radiusMeters: 1000, limit: 2 };
  test("canonical detail fences future statuses", async () => {
    setup([{ ...canonical, status: "future_status" }]);
    const module = jest.requireActual("./bike-service") as typeof import("./bike-service");
    await expect(module.configuredBikeService.getById("canonical")).rejects.toThrow(/reconciliation/);
  });
  test("canonical service does not convert failed transport into mock stock", async () => {
    setup([], { message: "Network request timed out" });
    const module = jest.requireActual("./bike-service") as typeof import("./bike-service");
    await expect(module.configuredBikeService.listNearby(query)).rejects.toThrow("Network request timed out");
  });
  test("explicit API selection uses versioned inventory without database fallback", async () => {
    process.env.EXPO_PUBLIC_BIKE_DATA_SOURCE = "api";
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.invalid";
    const original = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ contractVersion: "inventory.v1", inventory: [], totalCount: 0, unsupportedCount: 0, returnedCount: 0, returnedUnsupportedCount: 0, serverTime: "time" }) });
    try {
      await expect(setup([{ ...canonical, status: "future_status" }]).listNearby(query)).resolves.toMatchObject({ totalCount: 0 });
      expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining("contractVersion=inventory.v1"));
    } finally { globalThis.fetch = original; }
  });
  test.each(["available", "maintenance", "future_status"])("%s is retained, consumes limit, preserves scope-safe facts", async (status) => {
    const service = setup([{ ...canonical, id: "unsupported", status, active_rider_id: "private", active_ride_started_at: "precise" }, canonical, { ...canonical, id: "outside", status, latitude: 50 }]);
    const result = await service.listNearby(query);
    expect(result).toMatchObject({ contractVersion: "inventory.v1", totalCount: 2, unsupportedCount: 1, returnedCount: 2, returnedUnsupportedCount: 1 });
    expect(result.inventory).toEqual([
      { kind: "unsupported", id: "unsupported", rawStatus: status, reason: "STATUS_RECONCILIATION_REQUIRED", rentable: false, actionsAllowed: [], model: "Model", location: "Station", coordinates: { latitude: 13.75, longitude: 100.5 }, lastReportedAt: "time", activeRideStartedAt: "precise" },
      { kind: "supported", bike: expect.objectContaining({ id: "canonical", status: "ready_to_rent" }) }
    ]);
    expect((await service.listNearby({ ...query, limit: 1 })).inventory).toHaveLength(1);
  });
  test("outside-radius unsupported cannot poison canonical list", async () => {
    const result = await setup([canonical, { ...canonical, status: "future", latitude: 50 }]).listNearby(query);
    expect(result.totalCount).toBe(1); expect(result.unsupportedCount).toBe(0);
  });
  test("detail preserves unsupported versus true absence", async () => {
    const result = await setup([{ ...canonical, status: "future" }]).getById("canonical");
    expect(result).toMatchObject({ kind: "unsupported", rawStatus: "future" });
    expect(result).not.toHaveProperty("activeRiderId");
    await expect(setup([]).getById("absent")).resolves.toBeUndefined();
  });
  test("database/network failures remain failures without mock success", async () => {
    await expect(setup([], { message: "Network request timed out" }).listNearby(query)).rejects.toThrow("Network request timed out");
  });
});
