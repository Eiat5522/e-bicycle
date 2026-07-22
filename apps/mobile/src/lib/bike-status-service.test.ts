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

    const bikeQuery = {
      eq: mockEq,
      maybeSingle: mockMaybeSingle
    };

    mockSelect.mockReturnValue(bikeQuery);
    mockEq.mockReturnValue(bikeQuery);
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: "G-205",
        status: "available",
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
      p_expected_active_rider_id: null,
      p_expected_status: "available",
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
      data: [{ id: "G-205", status: "available", active_rider_id: null }],
      error: null
    });

    const { configuredBikeStatusService } = jest.requireActual(
      "./bike-status-service"
    ) as typeof import("./bike-status-service");

    await configuredBikeStatusService.updateBikeStatus({
      actorId: "user-1",
      bikeId: "G-205",
      status: "available"
    });

    expect(mockRpc).toHaveBeenCalledWith(
      "update_bike_status_with_event",
      expect.objectContaining({
        p_active_ride_start_location: null,
        p_active_ride_started_at: null,
        p_active_rider_id: null,
        p_expected_active_rider_id: "user-1",
        p_expected_status: "in_use",
        p_status: "available",
        p_transition_kind: "ride_end"
      })
    );
  });

  it("does not write when the bike already has the requested status", async () => {
    const { configuredBikeStatusService } = jest.requireActual(
      "./bike-status-service"
    ) as typeof import("./bike-status-service");

    await configuredBikeStatusService.updateBikeStatus({
      actorId: "user-1",
      bikeId: "G-205",
      status: "available"
    });

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
    ).rejects.toThrow("Only available bikes can be reserved.");
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
        status: "available"
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