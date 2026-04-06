import {
  bikeService,
  createHttpBikeService,
  mockAdminOverview,
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
    expect(result.bikes).toHaveLength(2);
    expect(result.bikes[0]?.id).toBe("G-104");
    expect(result.serverTime).toBeTruthy();
  });

  it("returns wallet data", async () => {
    const wallet = await walletService.getWallet();
    expect(wallet.balance).toBe(24.5);
  });

  it("creates a live agent session", async () => {
    const session = await supportService.startSession("live_agent");
    expect(session.status).toBe("escalated");
  });

  it("exposes admin overview data", () => {
    expect(mockAdminOverview.activeRides).toBe(1);
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
