import {
  bikeService,
  createHttpBikeService,
  getRideHistoryById,
  mockAdminOverview,
  mockExecutiveKpiSummary,
  mockRideHistory,
  supportService,
  walletService
} from "../src/index";

describe("mock api services", () => {
  it("returns nearby bikes", async () => {
    const result = await bikeService.listNearby({
      latitude: 37.7749,
      longitude: -122.4194,
      radiusMeters: 1500
    });
    expect(result.bikes).toHaveLength(6);
    expect(result.bikes[0]?.id).toBe("G-104");
    expect(result.bikes.some((bike) => bike.status === "in_use")).toBe(true);
    expect(result.serverTime).toBeTruthy();
  });

  it("returns wallet data", async () => {
    const wallet = await walletService.getWallet();
    expect(wallet.balance).toBe(24.5);
  });

  it("exposes ride history with replay checkpoints", () => {
    expect(mockRideHistory).toHaveLength(3);
    expect(mockRideHistory[0]?.route.length).toBeGreaterThan(1);
    expect(mockRideHistory[0]?.checkpoints[1]?.label).toBeTruthy();
    expect(getRideHistoryById("ride-history-2")?.endLocation).toBe("Lumphini Park West Gate");
  });

  it("creates a live agent session", async () => {
    const session = await supportService.startSession("live_agent");
    expect(session.status).toBe("escalated");
  });

  it("exposes admin overview data", () => {
    expect(mockAdminOverview.activeRides).toBe(1);
  });

  it("exposes executive KPI trend data", () => {
    expect(mockExecutiveKpiSummary.headlineMetrics.map((metric) => metric.label)).toEqual(
      expect.arrayContaining(["Wallet float", "Tracked revenue", "Active rides"])
    );
    expect(mockExecutiveKpiSummary.trends).toHaveLength(7);
    expect(mockExecutiveKpiSummary.trends[0]).toEqual(
      expect.objectContaining({
        label: expect.any(String),
        revenue: expect.any(Number),
        activeRides: expect.any(Number),
        utilization: expect.any(Number),
        supportLoad: expect.any(Number)
      })
    );
  });

  it("creates an http bike service with typed nearby query parameters", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        bikes: [],
        serverTime: "2026-04-06T09:00:00Z"
      })
    });
    const service = createHttpBikeService({
      baseUrl: "https://api.example.com",
      fetchImpl
    });

    await service.listNearby({
      latitude: 13.7563,
      longitude: 100.5018,
      radiusMeters: 1500,
      limit: 20
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/bikes/nearby?lat=13.7563&lng=100.5018&radius=1500&limit=20"
    );
  });

  it("encodes bike ids in detail requests", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => undefined
    });
    const service = createHttpBikeService({
      baseUrl: "https://api.example.com",
      fetchImpl
    });

    await service.getById("../bike?id=1");

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/bikes/..%2Fbike%3Fid%3D1"
    );
  });
});
