import type { Database } from "./supabase.types";

function loadService(insertData: unknown) {
  jest.resetModules();
  let captured: unknown = null;
  const from = jest.fn().mockReturnValue({
    insert: jest.fn().mockImplementation((value: unknown) => {
      captured = value;
      return {
        select: jest.fn().mockReturnValue({
          single: jest
            .fn()
            .mockResolvedValue({ data: insertData, error: null })
        })
      };
    })
  });
  const getSession = jest
    .fn()
    .mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
  const rpc = jest.fn();

  jest.doMock("./supabase", () => ({
    hasSupabaseConfig: true,
    supabase: {
      auth: { getSession },
      from,
      rpc
    }
  }));

  const { configuredTelemetryService } = jest.requireActual(
    "./telemetry-service"
  ) as typeof import("./telemetry-service");

  return {
    configuredTelemetryService,
    insertArg: () => captured as never
  };
}

describe("configuredTelemetryService", () => {
  it("reports an operational event with a WKT point for GPS coords", async () => {
    const { configuredTelemetryService, insertArg } = loadService({
      id: "evt-1",
      bike_id: "G-205",
      event_type: "unlock",
      gps_location: "POINT(100.5 13.75)",
      created_at: "2026-07-14T00:00:00.000Z"
    });

    const event = await configuredTelemetryService.reportOperationalEvent({
      bikeId: "G-205",
      eventType: "unlock",
      latitude: 13.75,
      longitude: 100.5
    });

    expect(event.id).toBe("evt-1");
    expect(event.gpsLocation).toBe("POINT(100.5 13.75)");

    const arg = insertArg()! as Database["public"]["Tables"]["operational_events"]["Insert"];
    expect(arg.gps_location).toBe("POINT(100.5 13.75)");
  });

  it("records a charging telemetry session", async () => {
    const { configuredTelemetryService, insertArg } = loadService({
      id: "chg-1",
      battery_id: "BAT-001",
      status: "charging",
      started_at: "2026-07-14T00:00:00.000Z",
      completed_at: null
    });

    const log = await configuredTelemetryService.recordChargingTelemetry({
      batteryId: "BAT-001",
      stationId: "ST-1",
      status: "charging",
      voltage: 48.2,
      currentAmp: 6.1,
      temperatureC: 32.5,
      stateOfHealth: 96
    });

    expect(log.batteryId).toBe("BAT-001");
    expect(log.status).toBe("charging");
    expect(log.startedAt).not.toBeNull();

    const arg = insertArg()! as Database["public"]["Tables"]["battery_charging_logs"]["Insert"];
    expect(arg.started_at).not.toBeNull();
    expect(arg.completed_at).toBeUndefined();
  });

  it("propagates insert errors", async () => {
    jest.resetModules();
    const from = jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest
            .fn()
            .mockResolvedValue({ data: null, error: { message: "boom" } })
        })
      })
    });
    const getSession = jest
      .fn()
      .mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
    jest.doMock("./supabase", () => ({
      hasSupabaseConfig: true,
      supabase: { auth: { getSession }, from, rpc: jest.fn() }
    }));
    const { configuredTelemetryService: svc } = jest.requireActual(
      "./telemetry-service"
    ) as typeof import("./telemetry-service");

    await expect(
      svc.reportOperationalEvent({
        bikeId: "G-205",
        eventType: "return"
      })
    ).rejects.toThrow(/boom/);
  });
});
