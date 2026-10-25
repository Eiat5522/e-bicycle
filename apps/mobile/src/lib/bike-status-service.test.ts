const mockStored = new Map<string, string>();
const mockStorage = {
  getItem: jest.fn(async (key: string) => mockStored.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => { mockStored.set(key, value); }),
  removeItem: jest.fn(async (key: string) => { mockStored.delete(key); }),
  getAllKeys: jest.fn(async () => [...mockStored.keys()])
};
jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true, default: mockStorage
}));

const mockMaybeSingle = jest.fn();
const mockEq = jest.fn();
const mockSelect = jest.fn();
const mockRpc = jest.fn();

jest.mock("./supabase", () => ({
  hasSupabaseConfig: true,
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect
    })),
    rpc: mockRpc
  }
}));

describe("configuredBikeStatusService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockStored.clear();

    const bikeQuery = {
      eq: mockEq,
      maybeSingle: mockMaybeSingle
    };

    mockSelect.mockReturnValue(bikeQuery);
    mockEq.mockReturnValue(bikeQuery);
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "G-205",
        status: "ready_to_rent",
        active_rider_id: null,
        active_ride_started_at: null,
        active_ride_start_location: null,
        location: "Asok Interchange"
      },
      error: null
    });
    mockRpc.mockResolvedValue({
      data: [{ id: "G-205", status: "in_use", active_rider_id: "user-1" }],
      error: null
    });
  });

  it("removes a rejected attempt when its tombstone cannot be written", async () => {
    const { configuredBikeStatusService: service } = jest.requireActual("./bike-status-service");
    const input = { actorId: "user-1", bikeId: "G-205", status: "reserved" };
    mockStorage.setItem.mockImplementationOnce(async (key, value) => { mockStored.set(key, value); })
      .mockRejectedValueOnce(new Error("disk full"));
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "denied" } });
    await expect(service.updateBikeStatus(input)).rejects.toThrow("denied");
    jest.resetModules();
    const { configuredBikeStatusService: restarted } = jest.requireActual("./bike-status-service");
    await restarted.updateBikeStatus(input);
    expect(mockMaybeSingle).toHaveBeenCalledTimes(2);
  });

  it("blocks stale dispatch after restart when both terminal persistence operations fail", async () => {
    const { configuredBikeStatusService: service } = jest.requireActual("./bike-status-service");
    const input = { actorId: "user-1", bikeId: "G-205", status: "reserved" };
    mockStorage.setItem.mockImplementationOnce(async (key, value) => { mockStored.set(key, value); })
      .mockRejectedValueOnce(new Error("disk full"));
    mockStorage.removeItem.mockRejectedValueOnce(new Error("disk unavailable"));
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "denied" } });
    await expect(service.updateBikeStatus(input)).rejects.toThrow("storage");
    jest.resetModules();
    const { configuredBikeStatusService: restarted } = jest.requireActual("./bike-status-service");
    await expect(restarted.updateBikeStatus(input)).rejects.toThrow("support");
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it("refetches after terminal rejection instead of poisoning the next attempt", async () => {
    const { configuredBikeStatusService: service } = jest.requireActual("./bike-status-service");
    const input = { actorId: "user-1", bikeId: "G-205", status: "in_use" };
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: "40001", message: "stale" } });
    await expect(service.updateBikeStatus(input)).rejects.toThrow("stale");
    await service.updateBikeStatus(input);
    expect(mockMaybeSingle).toHaveBeenCalledTimes(2);
  });

  it("recovers the byte-equivalent original payload after restart before fetching", async () => {
    const { configuredBikeStatusService: service } = jest.requireActual("./bike-status-service");
    const input = { actorId: "user-1", bikeId: "G-205", status: "in_use" };
    mockRpc.mockRejectedValueOnce(new Error("response lost"));
    await expect(service.updateBikeStatus(input)).rejects.toThrow("response lost");
    const bytes = JSON.stringify(mockRpc.mock.calls[0][1]);
    expect(mockStored.size).toBe(1);
    jest.resetModules();
    const { configuredBikeStatusService: restarted } = jest.requireActual("./bike-status-service");
    await restarted.updateBikeStatus(input);
    expect(JSON.stringify(mockRpc.mock.calls[1][1])).toBe(bytes);
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
    expect(mockStored.size).toBe(0);
  });

  it("coalesces concurrent requests before fetching or persisting", async () => {
    const { configuredBikeStatusService: service } = jest.requireActual("./bike-status-service");
    const input = { actorId: "user-1", bikeId: "G-205", status: "in_use" };
    await Promise.all([service.updateBikeStatus(input), service.updateBikeStatus(input)]);
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it("reconciles only the current actor's durable attempts after restart", async () => {
    const { configuredBikeStatusService: service } = jest.requireActual("./bike-status-service");
    mockRpc.mockRejectedValueOnce(new Error("offline"));
    await expect(service.updateBikeStatus({ actorId: "user-1", bikeId: "G-205", status: "reserved" })).rejects.toThrow();
    const bytes = JSON.stringify(mockRpc.mock.calls[0][1]);
    jest.resetModules();
    const { configuredBikeStatusService: restarted } = jest.requireActual("./bike-status-service");
    await restarted.reconcilePendingStatusChanges("user-2");
    expect(mockRpc).toHaveBeenCalledTimes(1);
    await restarted.reconcilePendingStatusChanges("user-1");
    expect(JSON.stringify(mockRpc.mock.calls[1][1])).toBe(bytes);
  });

  it("never dispatches if exact request persistence fails", async () => {
    const { configuredBikeStatusService: service } = jest.requireActual("./bike-status-service");
    mockStorage.setItem.mockRejectedValueOnce(new Error("disk full"));
    await expect(service.updateBikeStatus({ actorId: "user-1", bikeId: "G-205", status: "in_use" })).rejects.toThrow("disk full");
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockStored.size).toBe(0);
  });

  it("never fetches or dispatches when durable recovery cannot be read", async () => {
    const { configuredBikeStatusService: service } = jest.requireActual("./bike-status-service");
    mockStorage.getItem.mockRejectedValueOnce(new Error("storage unavailable"));
    await expect(service.updateBikeStatus({ actorId: "user-1", bikeId: "G-205", status: "in_use" })).rejects.toThrow("storage unavailable");
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockMaybeSingle).not.toHaveBeenCalled();
  });

  it("clears definitive rejections durably before a new process retries", async () => {
    const { configuredBikeStatusService: service } = jest.requireActual("./bike-status-service");
    const input = { actorId: "user-1", bikeId: "G-205", status: "reserved" };
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "denied" } });
    await expect(service.updateBikeStatus(input)).rejects.toThrow("denied");
    expect(mockStored.size).toBe(0);
    jest.resetModules();
    const { configuredBikeStatusService: restarted } = jest.requireActual("./bike-status-service");
    await restarted.updateBikeStatus(input);
    expect(mockMaybeSingle).toHaveBeenCalledTimes(2);
  });

  it("isolates a different actor's fresh request without overwriting the original", async () => {
    const { configuredBikeStatusService: service } = jest.requireActual("./bike-status-service");
    mockRpc.mockRejectedValueOnce(new Error("offline"));
    await expect(service.updateBikeStatus({ actorId: "user-1", bikeId: "G-205", status: "reserved" })).rejects.toThrow();
    const original = [...mockStored.values()][0];
    await service.updateBikeStatus({ actorId: "user-2", bikeId: "G-205", status: "reserved" });
    expect(mockRpc.mock.calls[1][1].p_actor_id).toBe("user-2");
    expect([...mockStored.values()]).toEqual([original]);
  });

  it("blocks a different transition while an ambiguous attempt is unresolved", async () => {
    const { configuredBikeStatusService: service } = jest.requireActual("./bike-status-service");
    mockRpc.mockRejectedValueOnce(new Error("offline"));
    await expect(service.updateBikeStatus({ actorId: "user-1", bikeId: "G-205", status: "reserved" })).rejects.toThrow();
    const original = [...mockStored.values()][0];
    await expect(service.updateBikeStatus({ actorId: "user-1", bikeId: "G-205", status: "in_use" })).rejects.toThrow("Resolve the pending");
    expect([...mockStored.values()]).toEqual([original]);
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it("retains exact identity on a gateway connection error", async () => {
    const { configuredBikeStatusService: service } = jest.requireActual("./bike-status-service");
    const input = { actorId: "user-1", bikeId: "G-205", status: "reserved" };
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST000", message: "database connection lost" } });
    await expect(service.updateBikeStatus(input)).rejects.toThrow("database connection lost");
    const payload = JSON.stringify(mockRpc.mock.calls[0][1]);
    await service.updateBikeStatus(input);
    expect(JSON.stringify(mockRpc.mock.calls[1][1])).toBe(payload);
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it("keeps a terminal tombstone if cleanup fails and never replays the rejected payload", async () => {
    const { configuredBikeStatusService: service } = jest.requireActual("./bike-status-service");
    const input = { actorId: "user-1", bikeId: "G-205", status: "reserved" };
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: "40001", message: "stale" } });
    mockStorage.removeItem.mockRejectedValueOnce(new Error("cleanup unavailable"));
    await expect(service.updateBikeStatus(input)).rejects.toThrow("cleanup unavailable");
    expect(JSON.parse([...mockStored.values()][0]!)).toEqual({ resolved: true });
    jest.resetModules();
    const { configuredBikeStatusService: restarted } = jest.requireActual("./bike-status-service");
    await restarted.updateBikeStatus(input);
    expect(mockMaybeSingle).toHaveBeenCalledTimes(2);
  });

  it("rejects a concurrent different transition without overwriting the running attempt", async () => {
    const { configuredBikeStatusService: service } = jest.requireActual("./bike-status-service");
    let resolve!: (value: unknown) => void;
    mockRpc.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const first = service.updateBikeStatus({ actorId: "user-1", bikeId: "G-205", status: "reserved" });
    await expect(service.updateBikeStatus({ actorId: "user-1", bikeId: "G-205", status: "in_use" })).rejects.toThrow("already in progress");
    while (!resolve) await Promise.resolve();
    resolve({ data: [{ id: "G-205" }], error: null });
    await first;
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockStorage.setItem.mock.calls[0]?.[1]).toContain('"p_status":"reserved"');
  });

  it("starts a ride through the atomic bike-status RPC", async () => {
    const { configuredBikeStatusService } = jest.requireActual(
      "./bike-status-service"
    ) as typeof import("./bike-status-service");

    await configuredBikeStatusService.updateBikeStatus({
      actorId: "user-1",
      bikeId: "G-205",
      status: "in_use"
    });

    expect(mockSelect).toHaveBeenCalledWith(
      "id, status, active_rider_id, location, active_ride_started_at, active_ride_start_location"
    );
    expect(mockEq).toHaveBeenCalledWith("id", "G-205");
    expect(mockRpc).toHaveBeenCalledWith("update_bike_status_with_event", {
      p_active_ride_start_location: "Asok Interchange",
      p_active_ride_started_at: expect.any(String),
      p_active_rider_id: "user-1",
      p_actor_id: "user-1",
      p_bike_id: "G-205",
      p_context: {
        active_ride_start_location: null,
        active_ride_started_at: null,
        active_rider_id_after: "user-1",
        active_rider_id_before: null,
        bike_location: "Asok Interchange",
        requested_status: "in_use",
        source: "apps/mobile/src/lib/bike-status-service.ts"
      },
      p_expected_active_rider_id: undefined,
      p_expected_status: "ready_to_rent",
      p_last_reported_at: expect.any(String),
      p_status: "in_use",
      p_transition_kind: "ride_start"
    });
  });

  it("ends the active rider's ride and clears ride ownership", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "G-205",
        status: "in_use",
        active_rider_id: "user-1",
        active_ride_started_at: "2026-07-22T00:00:00.000Z",
        active_ride_start_location: "Asok Interchange",
        location: "Benjakitti Park"
      },
      error: null
    });
    mockRpc.mockResolvedValueOnce({
      data: [{ id: "G-205", status: "returned_pending_inspection", active_rider_id: null }],
      error: null
    });

    const { configuredBikeStatusService } = jest.requireActual(
      "./bike-status-service"
    ) as typeof import("./bike-status-service");

    await configuredBikeStatusService.updateBikeStatus({
      actorId: "user-1",
      bikeId: "G-205",
      status: "returned_pending_inspection"
    });

    expect(mockRpc).toHaveBeenCalledWith(
      "update_bike_status_with_event",
      expect.objectContaining({
        p_expected_active_rider_id: "user-1",
        p_expected_status: "in_use",
        p_status: "returned_pending_inspection",
        p_transition_kind: "ride_end"
      })
    );
    const payload = mockRpc.mock.calls[0]?.[1];
    // Omitted optional RPC arguments use the server's SQL NULL defaults.
    expect(payload).not.toHaveProperty("p_active_rider_id");
    expect(payload).not.toHaveProperty("p_active_ride_started_at");
    expect(payload).not.toHaveProperty("p_active_ride_start_location");
  });

  it("replays the exact return payload after a lost response without refetching", async () => {
    const { configuredBikeStatusService } = jest.requireActual(
      "./bike-status-service"
    ) as typeof import("./bike-status-service");
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: "retry-bike", status: "in_use", active_rider_id: "retry-rider",
        active_ride_started_at: "2026-07-22T00:00:00.000Z",
        active_ride_start_location: "Asok", location: "Park" }, error: null
    });
    mockRpc.mockRejectedValueOnce(new Error("response lost"));
    const input = { actorId: "retry-rider", bikeId: "retry-bike",
      status: "returned_pending_inspection" as const };
    await expect(configuredBikeStatusService.updateBikeStatus(input)).rejects.toThrow("response lost");
    const originalPayload = mockRpc.mock.calls[0]?.[1];
    jest.resetModules();
    const { configuredBikeStatusService: restarted } = jest.requireActual("./bike-status-service");
    await restarted.updateBikeStatus(input);
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(mockRpc.mock.calls[1]?.[1]).toEqual(originalPayload);
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it.each(["reserved", "in_use"] as const)("preserves %s payload identity after an RPC error response", async (status) => {
    const { configuredBikeStatusService } = jest.requireActual(
      "./bike-status-service"
    ) as typeof import("./bike-status-service");
    const input = { actorId: "user-1", bikeId: "G-205", status };
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: "Failed to fetch" } });
    await expect(configuredBikeStatusService.updateBikeStatus(input)).rejects.toThrow("Failed to fetch");
    const payload = mockRpc.mock.calls[0]?.[1];
    await configuredBikeStatusService.updateBikeStatus(input);
    expect(mockRpc.mock.calls[1]?.[1]).toEqual(payload);
    expect(mockMaybeSingle).toHaveBeenCalledTimes(1);
  });

  it("does not hide a server rejection of an invalidated exact retry", async () => {
    const { configuredBikeStatusService } = jest.requireActual(
      "./bike-status-service"
    ) as typeof import("./bike-status-service");
    const input = { actorId: "user-1", bikeId: "G-205", status: "in_use" as const };
    mockRpc.mockRejectedValueOnce(new Error("response lost"));
    await expect(configuredBikeStatusService.updateBikeStatus(input)).rejects.toThrow("response lost");
    mockRpc.mockResolvedValueOnce({ data: null, error: { code: "40001", message: "Bike state changed. Please retry." } });
    await expect(configuredBikeStatusService.updateBikeStatus(input)).rejects.toThrow("Bike state changed. Please retry.");
    expect(mockRpc.mock.calls[1]?.[1]).toEqual(mockRpc.mock.calls[0]?.[1]);
  });

  it("rejects a cleared-owner return without an exact pending payload", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "G-205",
        status: "returned_pending_inspection",
        active_rider_id: null,
        active_ride_started_at: null,
        active_ride_start_location: null,
        location: "Benjakitti Park"
      },
      error: null
    });

    const { configuredBikeStatusService } = jest.requireActual(
      "./bike-status-service"
    ) as typeof import("./bike-status-service");

    await expect(configuredBikeStatusService.updateBikeStatus({
      actorId: "user-1",
      bikeId: "G-205",
      status: "returned_pending_inspection"
    })).rejects.toThrow("Only in-use bikes can be returned for inspection.");

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects an in-use no-op requested by anyone except the active rider", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "G-205",
        status: "in_use",
        active_rider_id: "user-2",
        active_ride_started_at: "2026-07-22T00:00:00.000Z",
        active_ride_start_location: "Asok Interchange",
        location: "Benjakitti Park"
      },
      error: null
    });

    const { configuredBikeStatusService } = jest.requireActual(
      "./bike-status-service"
    ) as typeof import("./bike-status-service");

    await expect(
      configuredBikeStatusService.updateBikeStatus({
        actorId: "user-1",
        bikeId: "G-205",
        status: "in_use"
      })
    ).rejects.toThrow("This bike is already in use by another rider.");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("treats a reservation retry by its owner as an idempotent no-op", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "G-205",
        status: "reserved",
        active_rider_id: "user-1",
        active_ride_started_at: null,
        active_ride_start_location: null,
        location: "Benjakitti Park"
      },
      error: null
    });

    const { configuredBikeStatusService } = jest.requireActual(
      "./bike-status-service"
    ) as typeof import("./bike-status-service");

    await configuredBikeStatusService.updateBikeStatus({
      actorId: "user-1",
      bikeId: "G-205",
      status: "reserved"
    });

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects a reservation retry by a non-owner", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "G-205",
        status: "reserved",
        active_rider_id: "user-2",
        active_ride_started_at: null,
        active_ride_start_location: null,
        location: "Benjakitti Park"
      },
      error: null
    });

    const { configuredBikeStatusService } = jest.requireActual(
      "./bike-status-service"
    ) as typeof import("./bike-status-service");

    await expect(
      configuredBikeStatusService.updateBikeStatus({
        actorId: "user-1",
        bikeId: "G-205",
        status: "reserved"
      })
    ).rejects.toThrow("Only ready-to-rent bikes can be reserved.");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects a ride end requested by anyone except the active rider", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: "G-205",
        status: "in_use",
        active_rider_id: "user-2",
        active_ride_started_at: "2026-07-22T00:00:00.000Z",
        active_ride_start_location: "Asok Interchange",
        location: "Benjakitti Park"
      },
      error: null
    });

    const { configuredBikeStatusService } = jest.requireActual(
      "./bike-status-service"
    ) as typeof import("./bike-status-service");

    await expect(
      configuredBikeStatusService.updateBikeStatus({
        actorId: "user-1",
        bikeId: "G-205",
        status: "returned_pending_inspection"
      })
    ).rejects.toThrow("Only the active rider can end this ride.");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("reports a concurrent bike-state change when the RPC updates no row", async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });

    const { configuredBikeStatusService } = jest.requireActual(
      "./bike-status-service"
    ) as typeof import("./bike-status-service");

    await expect(
      configuredBikeStatusService.updateBikeStatus({
        actorId: "user-1",
        bikeId: "G-205",
        status: "in_use"
      })
    ).rejects.toThrow("Bike state changed. Please retry.");
  });

  it("surfaces RPC errors without hiding the database message", async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: "permission denied" }
    });

    const { configuredBikeStatusService } = jest.requireActual(
      "./bike-status-service"
    ) as typeof import("./bike-status-service");

    await expect(
      configuredBikeStatusService.updateBikeStatus({
        actorId: "user-1",
        bikeId: "G-205",
        status: "in_use"
      })
    ).rejects.toThrow("Failed to update bike status: permission denied");
  });
});