function loadService(operationalData: unknown, sustainabilityData: unknown) {
  jest.resetModules();
  const operationalQuery = {
    select: jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({ data: operationalData, error: null })
      })
    })
  };
  const sustainabilityQuery = {
    select: jest.fn().mockReturnValue({
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue({ data: sustainabilityData, error: null })
      })
    })
  };
  const from = jest.fn((table: string) =>
    table === "operational_reports" ? operationalQuery : sustainabilityQuery
  );

  jest.doMock("./supabase", () => ({
    hasSupabaseConfig: true,
    supabase: { from }
  }));

  const { configuredReportingService } = jest.requireActual(
    "./reporting-service"
  ) as typeof import("./reporting-service");

  return { configuredReportingService, from };
}

describe("configuredReportingService", () => {
  it("maps recent operational reports", async () => {
    const { configuredReportingService, from } = loadService(
      [
        {
          id: "op-1",
          report_type: "daily",
          period_start: "2026-07-14",
          period_end: "2026-07-14",
          utilization_rate: 45.5,
          daily_revenue: 1200,
          generated_at: "2026-07-15T00:00:00.000Z"
        }
      ],
      []
    );

    await expect(configuredReportingService.getOperationalReports()).resolves.toEqual([
      {
        id: "op-1",
        reportType: "daily",
        periodStart: "2026-07-14",
        periodEnd: "2026-07-14",
        utilizationRate: 45.5,
        dailyRevenue: 1200,
        generatedAt: "2026-07-15T00:00:00.000Z"
      }
    ]);
    expect(from).toHaveBeenCalledWith("operational_reports");
  });

  it("maps recent sustainability reports", async () => {
    const { configuredReportingService, from } = loadService([], [
      {
        id: "esg-1",
        period_start: "2026-07-14",
        period_end: "2026-07-14",
        carbon_reduced_kg: 9.2,
        energy_consumption_kwh: 4.6,
        trip_count: 12,
        generated_at: "2026-07-15T00:00:00.000Z"
      }
    ]);

    await expect(configuredReportingService.getSustainabilityReports()).resolves.toEqual([
      {
        id: "esg-1",
        periodStart: "2026-07-14",
        periodEnd: "2026-07-14",
        carbonReducedKg: 9.2,
        energyConsumptionKwh: 4.6,
        tripCount: 12,
        generatedAt: "2026-07-15T00:00:00.000Z"
      }
    ]);
    expect(from).toHaveBeenCalledWith("sustainability_reporting");
  });

  it("rejects non-positive report limits", async () => {
    const { configuredReportingService } = loadService([], []);

    await expect(
      configuredReportingService.getOperationalReports(0)
    ).rejects.toThrow(/positive number/);
  });
});
