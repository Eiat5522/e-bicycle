function loadService(rpcImpl: (name: string, args: unknown) => unknown) {
  jest.resetModules();
  const from = jest.fn();
  const getSession = jest
    .fn()
    .mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
  const rpc = jest.fn().mockImplementation(rpcImpl as never);

  jest.doMock("./supabase", () => ({
    hasSupabaseConfig: true,
    supabase: {
      auth: { getSession },
      from,
      rpc
    }
  }));

  const { configuredGeofenceService } = jest.requireActual(
    "./geofence-service"
  ) as typeof import("./geofence-service");

  return { configuredGeofenceService, from, getSession, rpc };
}

describe("configuredGeofenceService", () => {
  it("returns inside=true with the matching service area", async () => {
    const { configuredGeofenceService, rpc } = loadService(() => ({
      data: {
        id: "zone-1",
        zone_name: "Bangkok Central",
        city_name: "Bangkok",
        status: "active"
      },
      error: null
    }));

    const result = await configuredGeofenceService.check(13.75, 100.5);

    expect(result.inside).toBe(true);
    expect(result.serviceArea?.zoneName).toBe("Bangkok Central");
    expect(rpc).toHaveBeenCalledWith("check_service_area", {
      p_latitude: 13.75,
      p_longitude: 100.5
    });
  });

  it("returns inside=false when no area contains the point", async () => {
    const { configuredGeofenceService } = loadService(() => ({
      data: null,
      error: null
    }));

    const result = await configuredGeofenceService.check(1, 1);

    expect(result.inside).toBe(false);
    expect(result.serviceArea).toBeNull();
  });

  it("throws when coordinates are missing", async () => {
    const { configuredGeofenceService } = loadService(() => ({
      data: null,
      error: null
    }));

    await expect(
      configuredGeofenceService.check(undefined as unknown as number, 100.5)
    ).rejects.toThrow(/required numbers/);
  });

  it("propagates rpc errors", async () => {
    const { configuredGeofenceService, rpc } = loadService(() => ({
      data: null,
      error: { message: "boom" }
    }));

    await expect(
      configuredGeofenceService.check(13.75, 100.5)
    ).rejects.toThrow(/boom/);
    expect(rpc).toHaveBeenCalled();
  });
});
