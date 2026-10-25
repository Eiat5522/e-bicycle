import * as api from "../src";
const make = (api as typeof api & { createHttpInventoryService: (options: any) => any }).createHttpInventoryService;
const unsupported = { kind: "unsupported", id: "legacy", rawStatus: "future_status", reason: "STATUS_RECONCILIATION_REQUIRED", rentable: false, actionsAllowed: [] };
const payload = { contractVersion: "inventory.v1", inventory: [unsupported], totalCount: 1, unsupportedCount: 1, returnedCount: 1, returnedUnsupportedCount: 1, serverTime: "time" };
const query = { latitude: 1, longitude: 2, radiusMeters: 3, limit: 1 };
test("negotiates version explicitly and propagates transport errors", async () => {
  const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => payload });
  const service = make({ baseUrl: "https://api.invalid/", fetchImpl });
  await service.listNearby(query);
  expect(fetchImpl).toHaveBeenCalledWith("https://api.invalid/bikes/nearby?lat=1&lng=2&radius=3&contractVersion=inventory.v1&limit=1");
  fetchImpl.mockRejectedValue(new Error("failed to fetch"));
  await expect(service.getById("x")).rejects.toThrow("failed to fetch");
});
test("canonical detail rejects unsupported versioned data and unversioned unknown statuses", async () => {
  for (const value of [{ contractVersion: "inventory.v1", inventory: unsupported }, { id: "x", status: "future_status" }]) {
    const service = api.createHttpBikeService({ baseUrl: "https://api.invalid", fetchImpl: async () => ({ ok: true, status: 200, json: async () => value }) });
    await expect(service.getById("x")).rejects.toMatchObject({ code: "UNSUPPORTED_INVENTORY_CONTRACT" });
  }
});
test("external inventory validates explicit version and preserves unsupported detail/list", async () => {
  const fetchImpl = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => payload });
  const service = make({ baseUrl: "https://api.invalid/", fetchImpl });
  await expect(service.listNearby(query)).resolves.toEqual(payload);
  fetchImpl.mockResolvedValue({ ok: true, status: 200, json: async () => ({ contractVersion: "inventory.v1", inventory: unsupported }) });
  await expect(service.getById("legacy")).resolves.toEqual(unsupported);
  fetchImpl.mockResolvedValue({ ok: false, status: 404 });
  await expect(service.getById("absent")).resolves.toBeUndefined();
});
test.each([undefined, "inventory.v999"])("rejects DTO version %s explicitly", async (contractVersion) => {
  const service = make({ baseUrl: "https://api.invalid", fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ ...payload, contractVersion }) }) });
  await expect(service.listNearby(query)).rejects.toMatchObject({ code: "UNSUPPORTED_INVENTORY_CONTRACT" });
});
test("canonical clients fail explicitly instead of receiving a canonical-only subset", async () => {
  const service = api.createHttpBikeService({ baseUrl: "https://api.invalid", fetchImpl: async () => ({ ok: true, status: 200, json: async () => payload }) });
  await expect(service.listNearby(query)).rejects.toMatchObject({ code: "UNSUPPORTED_INVENTORY_CONTRACT" });
});
