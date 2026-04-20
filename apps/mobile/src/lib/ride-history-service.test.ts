describe("configuredRideHistoryService", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("loads ride history from Supabase when configured", async () => {
    const rideOrder = jest.fn().mockResolvedValue({
      data: [
        {
          id: "ride-1",
          bike_id: "G-205",
          profile_id: "user-1",
          started_at: "2026-04-04T10:15:00Z",
          completed_at: "2026-04-04T10:41:00Z",
          duration_sec: 1560,
          distance_km: 3.4,
          total_cost: 4.8,
          co2_saved_kg: 0.9,
          start_location: "อโศก Interchange",
          end_location: "Benjakitti Park",
          route_label: "อโศก Interchange to Benjakitti Park",
          payment_label: "Charged to Visa **** 4242",
          route: [{ latitude: 13.7372, longitude: 100.5606 }],
          checkpoints: []
        }
      ],
      error: null
    });
    const rideEq = jest.fn().mockReturnValue({ order: rideOrder });
    const rideSelect = jest.fn().mockReturnValue({ eq: rideEq });
    const bikeIn = jest.fn().mockResolvedValue({
      data: [{ id: "G-205", model: "Glide City" }],
      error: null
    });
    const bikeSelect = jest.fn().mockReturnValue({ in: bikeIn });
    const getSession = jest.fn().mockResolvedValue({
      data: { session: { user: { id: "user-1" } } }
    });
    const from = jest.fn((table: string) => {
      if (table === "bike_ride_history") {
        return { select: rideSelect };
      }

      if (table === "bikes") {
        return { select: bikeSelect };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    jest.doMock("./supabase", () => ({
      hasSupabaseConfig: true,
      supabase: {
        auth: { getSession },
        from
      }
    }));

    const { configuredRideHistoryService } = jest.requireActual("./ride-history-service") as typeof import("./ride-history-service");

    const rides = await configuredRideHistoryService.getRideHistory();

    expect(rides).toHaveLength(1);
    expect(rides[0]).toMatchObject({
      id: "ride-1",
      bikeId: "G-205",
      bikeModel: "Glide City",
      routeLabel: "อโศก Interchange to Benjakitti Park"
    });
    expect(rideEq).toHaveBeenCalledWith("profile_id", "user-1");
    expect(bikeIn).toHaveBeenCalledWith("id", ["G-205"]);
  });

  it("loads a single ride detail from Supabase", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: "ride-1",
        bike_id: "G-205",
        profile_id: "user-1",
        started_at: "2026-04-04T10:15:00Z",
        completed_at: "2026-04-04T10:41:00Z",
        duration_sec: 1560,
        distance_km: 3.4,
        total_cost: 4.8,
        co2_saved_kg: 0.9,
        start_location: "อโศก Interchange",
        end_location: "Benjakitti Park",
        route_label: "อโศก Interchange to Benjakitti Park",
        payment_label: "Charged to Visa **** 4242",
        route: [{ latitude: 13.7372, longitude: 100.5606 }],
        checkpoints: []
      },
      error: null
    });
    const eqProfile = jest.fn().mockReturnValue({ maybeSingle });
    const eqId = jest.fn().mockReturnValue({ eq: eqProfile });
    const rideSelect = jest.fn().mockReturnValue({ eq: eqId });
    const bikeIn = jest.fn().mockResolvedValue({
      data: [{ id: "G-205", model: "Glide City" }],
      error: null
    });
    const bikeSelect = jest.fn().mockReturnValue({ in: bikeIn });
    const getSession = jest.fn().mockResolvedValue({
      data: { session: { user: { id: "user-1" } } }
    });
    const from = jest.fn((table: string) => {
      if (table === "bike_ride_history") {
        return { select: rideSelect };
      }

      if (table === "bikes") {
        return { select: bikeSelect };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    jest.doMock("./supabase", () => ({
      hasSupabaseConfig: true,
      supabase: {
        auth: { getSession },
        from
      }
    }));

    const { configuredRideHistoryService } = jest.requireActual("./ride-history-service") as typeof import("./ride-history-service");

    const ride = await configuredRideHistoryService.getRideHistoryById("ride-1");

    expect(ride?.id).toBe("ride-1");
    expect(eqId).toHaveBeenCalledWith("id", "ride-1");
    expect(eqProfile).toHaveBeenCalledWith("profile_id", "user-1");
    expect(bikeIn).toHaveBeenCalledWith("id", ["G-205"]);
  });

  it("creates a completed demo ride in Supabase", async () => {
    const maybeSingle = jest.fn().mockResolvedValue({
      data: {
        id: "ride-new",
        bike_id: "G-205",
        profile_id: "user-1",
        started_at: "2026-04-14T10:00:00Z",
        completed_at: "2026-04-14T10:26:00Z",
        duration_sec: 1560,
        distance_km: 3.4,
        total_cost: 4.8,
        co2_saved_kg: 0.9,
        start_location: "อโศก Interchange",
        end_location: "Benjakitti Park",
        route_label: "อโศก Interchange to Benjakitti Park",
        payment_label: "Charged to your Glide wallet",
        route: [{ latitude: 13.7372, longitude: 100.5606 }],
        checkpoints: []
      },
      error: null
    });
    const insertSelect = jest.fn().mockReturnValue({ maybeSingle });
    const insert = jest.fn().mockReturnValue({ select: insertSelect });
    const bikeIn = jest.fn().mockResolvedValue({
      data: [{ id: "G-205", model: "Glide City" }],
      error: null
    });
    const bikeSelect = jest.fn().mockReturnValue({ in: bikeIn });
    const getSession = jest.fn().mockResolvedValue({
      data: { session: { user: { id: "user-1" } } }
    });
    const from = jest.fn((table: string) => {
      if (table === "bike_ride_history") {
        return { insert };
      }

      if (table === "bikes") {
        return { select: bikeSelect };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    jest.doMock("./supabase", () => ({
      hasSupabaseConfig: true,
      supabase: {
        auth: { getSession },
        from
      }
    }));

    const { configuredRideHistoryService } = jest.requireActual("./ride-history-service") as typeof import("./ride-history-service");

    const ride = await configuredRideHistoryService.completeDemoRide({ bikeId: "G-205" });

    expect(ride.id).toBe("ride-new");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        bike_id: "G-205",
        profile_id: "user-1"
      })
    );
    expect(bikeSelect).toHaveBeenCalledWith("id, model");
    expect(bikeIn).toHaveBeenCalledWith("id", ["G-205"]);
  });

  it("throws when no rider session exists", async () => {
    const getSession = jest.fn().mockResolvedValue({
      data: { session: null }
    });

    jest.doMock("./supabase", () => ({
      hasSupabaseConfig: true,
      supabase: {
        auth: { getSession },
        from: jest.fn()
      }
    }));

    const { configuredRideHistoryService } = jest.requireActual("./ride-history-service") as typeof import("./ride-history-service");

    await expect(configuredRideHistoryService.getRideHistory()).rejects.toThrow(
      "No active rider session was found."
    );
  });

  it("surfaces Supabase read failures", async () => {
    const order = jest.fn().mockResolvedValue({
      data: null,
      error: { message: "ride query failed" }
    });
    const eq = jest.fn().mockReturnValue({ order });
    const select = jest.fn().mockReturnValue({ eq });
    const getSession = jest.fn().mockResolvedValue({
      data: { session: { user: { id: "user-1" } } }
    });

    jest.doMock("./supabase", () => ({
      hasSupabaseConfig: true,
      supabase: {
        auth: { getSession },
        from: jest.fn().mockReturnValue({ select })
      }
    }));

    const { configuredRideHistoryService } = jest.requireActual("./ride-history-service") as typeof import("./ride-history-service");

    await expect(configuredRideHistoryService.getRideHistory()).rejects.toThrow(
      "Failed to fetch ride history: ride query failed"
    );
  });

  it("falls back to mock ride history when Supabase is not configured", async () => {
    jest.doMock("./supabase", () => ({
      hasSupabaseConfig: false,
      supabase: {
        auth: { getSession: jest.fn() },
        from: jest.fn()
      }
    }));

    const { configuredRideHistoryService } = jest.requireActual("./ride-history-service") as typeof import("./ride-history-service");

    const rides = await configuredRideHistoryService.getRideHistory();

    expect(rides.length).toBeGreaterThan(0);
  });
});
