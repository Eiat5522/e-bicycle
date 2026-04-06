import {
  bikeService,
  mockAdminOverview,
  supportService,
  walletService
} from "../src/index";

describe("mock api services", () => {
  it("returns nearby bikes", async () => {
    const bikes = await bikeService.listNearby();
    expect(bikes).toHaveLength(2);
    expect(bikes[0]?.id).toBe("G-104");
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
});
