function loadService(maybeSingleValue: unknown, rpcImpl?: (name: string, args: unknown) => unknown) {
  jest.resetModules();
  const from = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        maybeSingle: jest.fn().mockResolvedValue({
          data: maybeSingleValue,
          error: null
        })
      })
    })
  });
  const getSession = jest
    .fn()
    .mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
  const rpc = jest
    .fn()
    .mockImplementation(((name: string, args: unknown) =>
      rpcImpl ? rpcImpl(name, args) : { data: 1, error: null }) as never);

  jest.doMock("./supabase", () => ({
    hasSupabaseConfig: true,
    supabase: {
      auth: { getSession },
      from,
      rpc
    }
  }));

  const { configuredEngagementService } = jest.requireActual(
    "./engagement-service"
  ) as typeof import("./engagement-service");

  return { configuredEngagementService, from, getSession, rpc };
}

describe("configuredEngagementService", () => {
  it("throws when there is no active session", () => {
    jest.resetModules();
    const getSession = jest
      .fn()
      .mockResolvedValue({ data: { session: null } });
    jest.doMock("./supabase", () => ({
      hasSupabaseConfig: true,
      supabase: { auth: { getSession }, from: jest.fn(), rpc: jest.fn() }
    }));
    const { configuredEngagementService } = jest.requireActual(
      "./engagement-service"
    ) as typeof import("./engagement-service");

    return expect(
      configuredEngagementService.getEngagement()
    ).rejects.toThrow(/No active rider session/);
  });

  it("reads the aggregate for the authenticated rider", async () => {
    const { configuredEngagementService } = loadService({
      profile_id: "user-1",
      eco_points: 320,
      carbon_reduced_total_kg: 48.5,
      calories_burned_total: 2200,
      distance_accumulated_km: 44.2,
      last_updated: "2026-07-14T00:00:00.000Z"
    });

    const result = await configuredEngagementService.getEngagement();

    expect(result).toEqual({
      profileId: "user-1",
      ecoPoints: 320,
      carbonReducedTotalKg: 48.5,
      caloriesBurnedTotal: 2200,
      distanceAccumulatedKm: 44.2,
      lastUpdated: "2026-07-14T00:00:00.000Z"
    });
  });

  it("refreshes engagement then returns the aggregate", async () => {
    const { configuredEngagementService, rpc } = loadService(
      {
        profile_id: "user-1",
        eco_points: 10,
        carbon_reduced_total_kg: 1,
        calories_burned_total: 50,
        distance_accumulated_km: 1,
        last_updated: null
      },
      (name) =>
        name === "refresh_user_engagement"
          ? { data: 1, error: null }
          : { data: null, error: null }
    );

    const result = await configuredEngagementService.refreshOwnEngagement();

    expect(rpc).toHaveBeenCalledWith("refresh_user_engagement", {
      p_profile_id: "user-1"
    });
    expect(result?.ecoPoints).toBe(10);
  });

  it("returns undefined when there is no aggregate row", async () => {
    const { configuredEngagementService } = loadService(null);
    const result = await configuredEngagementService.getEngagement();
    expect(result).toBeUndefined();
  });
});
