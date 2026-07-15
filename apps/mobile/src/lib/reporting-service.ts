import { hasSupabaseConfig, supabase } from "./supabase";
import type { Database } from "./supabase.types";

type OperationalReportRow =
  Database["public"]["Tables"]["operational_reports"]["Row"];
type SustainabilityReportRow =
  Database["public"]["Tables"]["sustainability_reporting"]["Row"];
type OperationalReportSelection = Pick<
  OperationalReportRow,
  | "id"
  | "report_type"
  | "period_start"
  | "period_end"
  | "utilization_rate"
  | "daily_revenue"
  | "generated_at"
>;
type SustainabilityReportSelection = Pick<
  SustainabilityReportRow,
  | "id"
  | "period_start"
  | "period_end"
  | "carbon_reduced_kg"
  | "energy_consumption_kwh"
  | "trip_count"
  | "generated_at"
>;

export interface OperationalReport {
  readonly id: string;
  readonly reportType: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly utilizationRate: number | null;
  readonly dailyRevenue: number | null;
  readonly generatedAt: string;
}

export interface SustainabilityReport {
  readonly id: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly carbonReducedKg: number | null;
  readonly energyConsumptionKwh: number | null;
  readonly tripCount: number;
  readonly generatedAt: string;
}

export interface ConfiguredReportingService {
  getOperationalReports(limit?: number): Promise<readonly OperationalReport[]>;
  getSustainabilityReports(
    limit?: number
  ): Promise<readonly SustainabilityReport[]>;
}

function validateLimit(limit: number): void {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Report limit must be a positive number.");
  }
}

function mapOperationalReport(row: OperationalReportSelection): OperationalReport {
  return {
    id: row.id,
    reportType: row.report_type,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    utilizationRate: row.utilization_rate,
    dailyRevenue: row.daily_revenue,
    generatedAt: row.generated_at
  };
}

function mapSustainabilityReport(
  row: SustainabilityReportSelection
): SustainabilityReport {
  return {
    id: row.id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    carbonReducedKg: row.carbon_reduced_kg,
    energyConsumptionKwh: row.energy_consumption_kwh,
    tripCount: row.trip_count,
    generatedAt: row.generated_at
  };
}

function createSupabaseReportingService(): ConfiguredReportingService {
  return {
    async getOperationalReports(limit = 10) {
      validateLimit(limit);
      const { data, error } = await supabase
        .from("operational_reports")
        .select(
          "id, report_type, period_start, period_end, utilization_rate, daily_revenue, generated_at"
        )
        .order("generated_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch operational reports: ${error.message}`);
      }

      return (data ?? []).map(mapOperationalReport);
    },
    async getSustainabilityReports(limit = 10) {
      validateLimit(limit);
      const { data, error } = await supabase
        .from("sustainability_reporting")
        .select(
          "id, period_start, period_end, carbon_reduced_kg, energy_consumption_kwh, trip_count, generated_at"
        )
        .order("generated_at", { ascending: false })
        .limit(limit);

      if (error) {
        throw new Error(`Failed to fetch sustainability reports: ${error.message}`);
      }

      return (data ?? []).map(mapSustainabilityReport);
    }
  };
}

function createMockReportingService(): ConfiguredReportingService {
  const generatedAt = "2026-07-15T00:00:00.000Z";
  const operationalReports: readonly OperationalReport[] = [
    {
      id: "report-mock-1",
      reportType: "daily",
      periodStart: "2026-07-14",
      periodEnd: "2026-07-14",
      utilizationRate: 42.5,
      dailyRevenue: 1800,
      generatedAt
    }
  ];
  const sustainabilityReports: readonly SustainabilityReport[] = [
    {
      id: "sustainability-mock-1",
      periodStart: "2026-07-14",
      periodEnd: "2026-07-14",
      carbonReducedKg: 7.8,
      energyConsumptionKwh: 3.9,
      tripCount: 11,
      generatedAt
    }
  ];

  return {
    async getOperationalReports(limit = 10) {
      validateLimit(limit);
      return operationalReports.slice(0, limit);
    },
    async getSustainabilityReports(limit = 10) {
      validateLimit(limit);
      return sustainabilityReports.slice(0, limit);
    }
  };
}

export const configuredReportingService: ConfiguredReportingService =
  hasSupabaseConfig
    ? createSupabaseReportingService()
    : createMockReportingService();
