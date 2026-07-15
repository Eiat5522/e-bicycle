import { hasSupabaseConfig, supabase } from "./supabase";
import type { Database } from "./supabase.types";

type OperationalEventInsert =
  Database["public"]["Tables"]["operational_events"]["Insert"];
type ChargingLogInsert =
  Database["public"]["Tables"]["battery_charging_logs"]["Insert"];

export type OperationalEventType =
  | "unlock"
  | "parking"
  | "return"
  | "photo_proof"
  | "gps_report"
  | "checkpoint"
  | "other";

export interface ReportOperationalEventInput {
  readonly rentalTransactionId?: string;
  readonly bikeId?: string;
  readonly eventType: OperationalEventType;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly photoProofUrl?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface RecordChargingTelemetryInput {
  readonly batteryId: string;
  readonly stationId?: string;
  readonly chargingSlotId?: string;
  readonly status: "charging" | "completed" | "swapped";
  readonly voltage?: number;
  readonly currentAmp?: number;
  readonly temperatureC?: number;
  readonly stateOfHealth?: number;
  readonly swapFromBatteryId?: string;
  readonly swapToBatteryId?: string;
}

export interface OperationalEvent {
  readonly id: string;
  readonly bikeId: string | null;
  readonly eventType: string;
  readonly gpsLocation: string | null;
  readonly createdAt: string;
}

export interface ChargingLog {
  readonly id: string;
  readonly batteryId: string | null;
  readonly status: string | null;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
}

export interface ConfiguredTelemetryService {
  reportOperationalEvent(
    input: ReportOperationalEventInput
  ): Promise<OperationalEvent>;
  recordChargingTelemetry(
    input: RecordChargingTelemetryInput
  ): Promise<ChargingLog>;
}

function buildGpsPoint(
  latitude?: number,
  longitude?: number
): string | null {
  if (latitude == null || longitude == null) {
    return null;
  }

  return `POINT(${longitude} ${latitude})`;
}

function createSupabaseTelemetryService(): ConfiguredTelemetryService {
  return {
    async reportOperationalEvent(input) {
      const gpsLocation = buildGpsPoint(
        input.latitude,
        input.longitude
      );

      const insert: OperationalEventInsert = {
        rental_transaction_id: input.rentalTransactionId ?? null,
        bike_id: input.bikeId ?? null,
        event_type: input.eventType,
        gps_location: (gpsLocation as never) ?? null,
        photo_proof_url: input.photoProofUrl ?? null,
        metadata: (input.metadata ?? {}) as
          | Database["public"]["Tables"]["operational_events"]["Row"]["metadata"]
          | null
      };

      const { data, error } = await supabase
        .from("operational_events")
        .insert(insert)
        .select("id, bike_id, event_type, gps_location, created_at")
        .single();

      if (error) {
        throw new Error(`Failed to report event: ${error.message}`);
      }

      return {
        id: data.id,
        bikeId: data.bike_id,
        eventType: data.event_type,
        gpsLocation: (data.gps_location as string | null),
        createdAt: data.created_at
      };
    },
    async recordChargingTelemetry(input) {
      const insert: ChargingLogInsert = {
        battery_id: input.batteryId,
        station_id: input.stationId ?? null,
        charging_slot_id: input.chargingSlotId ?? null,
        status: input.status,
        voltage: input.voltage ?? null,
        current_amp: input.currentAmp ?? null,
        temperature_c: input.temperatureC ?? null,
        state_of_health: input.stateOfHealth ?? null,
        swap_from_battery_id: input.swapFromBatteryId ?? null,
        swap_to_battery_id: input.swapToBatteryId ?? null,
        source_system: "mobile_app",
        metadata: {}
      };

      if (input.status === "charging") {
        insert.started_at = new Date().toISOString();
      } else if (input.status === "completed") {
        insert.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("battery_charging_logs")
        .insert(insert)
        .select(
          "id, battery_id, status, started_at, completed_at"
        )
        .single();

      if (error) {
        throw new Error(`Failed to record charging telemetry: ${error.message}`);
      }

      return {
        id: data.id,
        batteryId: data.battery_id,
        status: data.status,
        startedAt: data.started_at,
        completedAt: data.completed_at
      } as ChargingLog;
    }
  };
}

function createMockTelemetryService(): ConfiguredTelemetryService {
  return {
    async reportOperationalEvent(input) {
      return {
        id: `evt_${Date.now()}`,
        bikeId: input.bikeId ?? null,
        eventType: input.eventType,
        gpsLocation: buildGpsPoint(input.latitude, input.longitude),
        createdAt: new Date().toISOString()
      };
    },
    async recordChargingTelemetry(input) {
      return {
        id: `chg_${Date.now()}`,
        batteryId: input.batteryId,
        status: input.status,
        startedAt:
          input.status === "charging" ? new Date().toISOString() : null,
        completedAt:
          input.status === "completed" ? new Date().toISOString() : null
      };
    }
  };
}

export const configuredTelemetryService: ConfiguredTelemetryService =
  hasSupabaseConfig
    ? createSupabaseTelemetryService()
    : createMockTelemetryService();
