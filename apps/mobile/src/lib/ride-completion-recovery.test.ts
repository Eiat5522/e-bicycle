const mockStored = new Map<string, string>();
const mockStorage = {
  getItem: jest.fn(async (key: string) => mockStored.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => { mockStored.set(key, value); })
};
jest.mock("@react-native-async-storage/async-storage", () => ({ __esModule: true, default: mockStorage }));
const mockRpc = jest.fn();
const mockBikeIn = jest.fn();
let mockActor = "rider-1";
jest.mock("./supabase", () => ({ hasSupabaseConfig: true, supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: mockActor } } } }) },
  rpc: mockRpc,
  from: () => ({ select: () => ({ in: mockBikeIn }) })
} }));
const result = { id: "ride-1", bike_id: "bike-1", profile_id: "rider-1", route: [], checkpoints: [] };
const input = { bikeId: "bike-1", rideStartedAt: "2026-07-28T10:00:00.123456+00:00", distanceKm: 2 };
function service() {
  return (jest.requireActual("./ride-history-service") as typeof import("./ride-history-service")).configuredRideHistoryService;
}
beforeEach(() => {
  jest.resetModules(); jest.clearAllMocks(); mockStored.clear(); mockActor = "rider-1";
  mockRpc.mockReset().mockResolvedValue({ data: result, error: null });
  mockBikeIn.mockReset().mockResolvedValue({ data: [], error: null });
});
it("recovers response loss after restart using the immutable saved request, not a new snapshot", async () => {
  mockRpc.mockRejectedValueOnce(new Error("response lost"));
  await expect(service().completeRide(input)).rejects.toThrow("response lost");
  expect(mockRpc.mock.calls[0][1].p_expected_ride_started_at).toBe(input.rideStartedAt);
  const bytes = JSON.stringify(mockRpc.mock.calls[0][1]);
  jest.resetModules();
  const recovered = await service().completeRide({ ...input, distanceKm: 99 });
  expect(recovered.id).toBe("ride-1");
  expect(mockRpc.mock.calls[1][0]).toBe("complete_ride_recoverable");
  expect(JSON.stringify(mockRpc.mock.calls[1][1])).toBe(bytes);
});
it("returns the committed result even if optional model lookup fails", async () => {
  mockBikeIn.mockRejectedValueOnce(new Error("offline after commit"));
  await expect(service().completeRide(input)).resolves.toMatchObject({ id: "ride-1", bikeModel: "bike-1" });
});
it("never dispatches without durable request storage", async () => {
  mockStorage.setItem.mockRejectedValueOnce(new Error("storage unavailable"));
  await expect(service().completeRide(input)).rejects.toThrow("storage unavailable");
  expect(mockRpc).not.toHaveBeenCalled();
});
it("does not reuse another actor's identity", async () => {
  mockRpc.mockRejectedValueOnce(new Error("offline"));
  await expect(service().completeRide(input)).rejects.toThrow();
  const identity = mockRpc.mock.calls[0][1].p_request_id;
  mockActor = "rider-2";
  await service().completeRide(input);
  expect(mockRpc.mock.calls[1][1].p_request_id).not.toBe(identity);
});

it("rejects missing authoritative start without dispatch", async () => {
  await expect(service().completeRide({ bikeId: "bike-1" })).rejects.toThrow("Authoritative ride start required");
  expect(mockRpc).not.toHaveBeenCalled();
});
it("never replays a legacy unscoped persisted payload", async () => {
  const key = "ride_completion_v1:" + JSON.stringify([mockActor, input.bikeId, input.rideStartedAt]);
  mockStored.set(key, JSON.stringify({ p_request_id: "old", p_bike_id: input.bikeId }));
  await expect(service().completeRide(input)).rejects.toThrow("Unscoped legacy requests");
  expect(mockRpc).not.toHaveBeenCalled();
});
