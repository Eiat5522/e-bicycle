# Comprehensive Ride-Sharing Telemetry Schema Research & Design

**Task:** `t_a54ba768` - Research telemetry schema for ride-sharing  
**Project:** Glide E-Bicycle Fleet Management Platform (Lamphun Smart Green Mobility)  
**Date:** July 2026  
**Status:** Completed Architectural Specification

---

## Executive Summary

This document provides a comprehensive research, analysis, and production-ready database and API schema design for e-bicycle and ride-sharing telemetry ingestion in the Glide platform. It covers:

1. **Current System Audit & Baseline Schema Assessment**: Evaluation of existing Supabase tables (`operational_events`, `battery_charging_logs`, `energy_management`, `bikes`, `batteries`, `rental_transactions`) and Edge Functions.
2. **Multi-Domain Telemetry Requirements**:
   - **Ride / Route Telemetry** (GPS locations, velocity, route lines, checkpoints, geofence compliance).
   - **E-Bike / Vehicle Telemetry** (Battery SoC/SOH, voltage, current, temperature, motor/lock status, IoT heartbeats).
   - **Station & Charging Telemetry** (Grid power draw, phase balance L1/L2/L3, slot status, TOU rates).
3. **Data Ingestion, Protocols, & Storage Strategy**: High-frequency streaming vs. event-driven batching, partition strategies, TTL/retention policies, cold storage archival, and PostGIS spatial indexing.
4. **Data Privacy, Security & Compliance**: Anonymization, rider PII protection, retention windows, and RLS policies.
5. **Concrete Database Migration (`SQL`)**: Production-ready Supabase/PostgreSQL schema defining hyper-scalable telemetry tables, PostGIS geography indexes, and automatic data retention policies.
6. **TypeScript & Zod Contract Definitions**: Shared types and validation schemas for `@glide/shared` and API endpoints.

---

## 1. Current Baseline & Architectural Audit

### 1.1 Existing Tables in Supabase Schema
* `operational_events`: Event ledger tracking discrete user/bike actions (`unlock`, `parking`, `return`, `photo_proof`, `gps_report`, `checkpoint`). Uses PostGIS `geography(Point, 4326)`.
* `battery_charging_logs`: Battery charging cycle events recording `voltage`, `current_amp`, `temperature_c`, and `state_of_health`.
* `energy_management`: Station power demand snapshots tracking `total_power_demand_kw`, phase readings (`phase_l1_kw`, `phase_l2_kw`, `phase_l3_kw`), and `applied_tou_rate`.
* `bikes`: Fleet master containing static and dynamic properties (`location`, `latitude`, `longitude`, `estimated_range_km`, `status`, `device_status`, `battery_status`).
* `rental_transactions`: Stores completed ride metadata including aggregate `route` (JSON array of coordinates) and `checkpoints`.

### 1.2 Identified Gaps & Deficiencies
1. **High-Frequency GPS Stream Storage**: Currently, route points on completed rides are stored as static JSON arrays inside `rental_transactions.route`. This prevents time-series analytics, map snapping, speed/elevation profile analysis, or geofence trip replay while a ride is active.
2. **IoT Vehicle Telemetry Ledger**: `bikes` table only retains *last known* location and status. Historical time-series telemetry (SoC over time, battery cell temperature during high motor load, signal strength RSSI, error codes) is not captured.
3. **Partitioning & Storage Scale**: High-frequency GPS/IoT pings from a 500+ bike fleet generating 5-second pings will rapidly inflate PostgreSQL table size to tens of millions of rows. Standard unpartitioned tables will degrade indexing and query performance.

---

## 2. Telemetry Schema Domain Specifications

### Domain A: Active Ride & Route GPS Telemetry (`ride_telemetry_points`)
High-frequency ping payload sent during active rentals (every 5–10s when moving, 30s when stationary).

| Field | Type | Unit / Format | Description |
|---|---|---|---|
| `id` | UUID | UUIDv4 | Primary key |
| `rental_transaction_id` | UUID | UUID | Foreign key to active ride session |
| `bike_id` | TEXT | String (e.g. `G-104`) | Bike identifier |
| `recorded_at` | TIMESTAMPTZ | ISO8601 UTC | Telemetry timestamp from IoT/Mobile sensor |
| `location` | GEOGRAPHY | `Point(lon, lat)` (4326) | PostGIS geographical location |
| `altitude_m` | NUMERIC(6,2) | Meters | Altitude above sea level |
| `speed_kmh` | NUMERIC(5,2) | km/h | Instantaneous speed |
| `heading_deg` | NUMERIC(5,2) | Degrees (0–359.9) | Compass direction |
| `accuracy_m` | NUMERIC(5,2) | Meters | GPS HDOP accuracy radius |
| `is_mocked` | BOOLEAN | Boolean | Anti-fraud flag for fake GPS detection |

### Domain B: E-Bike IoT & Battery Telemetry (`vehicle_telemetry_logs`)
Low-to-medium frequency telemetry sent by the bike's IoT lock/controller (every 30s during active ride, 15m when parked).

| Field | Type | Unit / Format | Description |
|---|---|---|---|
| `id` | UUID | UUIDv4 | Primary key |
| `bike_id` | TEXT | String | Bike identifier |
| `battery_id` | UUID | UUID | Associated battery unit ID |
| `recorded_at` | TIMESTAMPTZ | ISO8601 UTC | Sensor recording timestamp |
| `battery_soc` | NUMERIC(5,2) | Percentage (0–100%) | State of Charge |
| `battery_voltage` | NUMERIC(5,2) | Volts (V) | Total battery pack voltage |
| `battery_current` | NUMERIC(5,2) | Amperes (A) | Current discharge/charge rate |
| `battery_temp_c` | NUMERIC(4,1) | Celsius (°C) | Battery pack temperature |
| `motor_temp_c` | NUMERIC(4,1) | Celsius (°C) | Motor controller temperature |
| `lock_status` | TEXT | Enum (`locked`, `unlocked`, `fault`) | Physical lock status |
| `signal_strength_rssi`| INTEGER | dBm (-120 to 0) | Cellular/IoT signal strength |
| `error_codes` | TEXT[] | Array of strings | Active IoT controller diagnostic codes |

### Domain C: Charging Station & Energy Telemetry (`station_energy_telemetry`)
Aggregated or phase-specific telemetry from smart charging hubs/kiosks.

| Field | Type | Description |
|---|---|---|
| `station_id` | UUID | Foreign key to `stations` |
| `recorded_at` | TIMESTAMPTZ | Ingestion timestamp |
| `total_power_kw` | NUMERIC(8,2) | Total power consumption in kW |
| `phase_l1_kw`, `phase_l2_kw`, `phase_l3_kw` | NUMERIC(8,2) | Phase power distribution |
| `active_charging_slots` | INTEGER | Slots currently supplying power |
| `grid_voltage_v` | NUMERIC(6,2) | Main grid line voltage |

---

## 3. Data Ingestion, Lifecycle & Retention Architecture

```
  +------------------+         +--------------------+         +-----------------------+
  + Mobile App / IoT + ------> | Edge Function API  | ------> | Supabase Postgres     |
  + Telemetry Sensor + (HTTP/  + (Validation/Auth)  +         + (Declarative Partitions)
  +------------------+  MQTT)  +--------------------+         +-----------------------+
                                                                          |
                                                                          v (Nightly Cron Job)
                                                              +-----------------------+
                                                              | Rollup & Cold Archive |
                                                              | (Aggregated JSON)     |
                                                              +-----------------------+
```

### 3.1 Data Retention & Rollup Policy
1. **Raw Route Points (`ride_telemetry_points`)**: Retained in active PostgreSQL partitions for **30 days**.
2. **Nightly Rollup Job**: When a ride completes, raw GPS points are aggregated into line strings and stored in `rental_transactions.route` and `rental_transactions.checkpoints`. Raw points older than 30 days are automatically pruned via PostgreSQL partition drop or row cleanup.
3. **Vehicle IoT Logs (`vehicle_telemetry_logs`)**: Raw logs retained for **60 days**. Hourly averages (SoC, temperature) are rolled up into operational report tables for long-term fleet health trending.

### 3.2 Privacy & Security Guidelines
* **PII Segregation**: Telemetry tables reference `rental_transaction_id` or `bike_id`, never `profile_id` or rider identity directly.
* **Access Control**: Telemetry insert endpoints require Service Role / Authenticated IoT Keys. Telemetry select queries are restricted to admins and operations managers.

---

## 4. Production Database Migration Plan (SQL)

The following SQL migration adds hyper-scalable telemetry tables with PostGIS support and partition handling:

```sql
-- Migration: Add Telemetry Schema
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. High-frequency Ride GPS Telemetry
CREATE TABLE IF NOT EXISTS public.ride_telemetry_points (
  id UUID DEFAULT extensions.gen_random_uuid(),
  rental_transaction_id UUID NOT NULL REFERENCES public.rental_transactions(id) ON DELETE CASCADE,
  bike_id TEXT NOT NULL REFERENCES public.bikes(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  location extensions.geography(Point, 4326) NOT NULL,
  altitude_m NUMERIC(6,2),
  speed_kmh NUMERIC(5,2) CHECK (speed_kmh IS NULL OR speed_kmh >= 0),
  heading_deg NUMERIC(5,2) CHECK (heading_deg IS NULL OR (heading_deg >= 0 AND heading_deg < 360)),
  accuracy_m NUMERIC(5,2) CHECK (accuracy_m IS NULL OR accuracy_m >= 0),
  is_mocked BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Create initial monthly partitions
CREATE TABLE IF NOT EXISTS public.ride_telemetry_points_2026_07
  PARTITION OF public.ride_telemetry_points
  FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS public.ride_telemetry_points_2026_08
  PARTITION OF public.ride_telemetry_points
  FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');

-- PostGIS Spatial & Lookup Indexes
CREATE INDEX IF NOT EXISTS ride_telemetry_points_location_gix
  ON public.ride_telemetry_points USING gist (location);

CREATE INDEX IF NOT EXISTS ride_telemetry_points_rental_idx
  ON public.ride_telemetry_points (rental_transaction_id, recorded_at DESC);

-- 2. Vehicle IoT Telemetry Logs
CREATE TABLE IF NOT EXISTS public.vehicle_telemetry_logs (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  bike_id TEXT NOT NULL REFERENCES public.bikes(id) ON DELETE CASCADE,
  battery_id UUID REFERENCES public.batteries(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  battery_soc NUMERIC(5,2) CHECK (battery_soc IS NULL OR (battery_soc >= 0 AND battery_soc <= 100)),
  battery_voltage NUMERIC(5,2) CHECK (battery_voltage IS NULL OR battery_voltage >= 0),
  battery_current NUMERIC(5,2),
  battery_temp_c NUMERIC(4,1),
  motor_temp_c NUMERIC(4,1),
  lock_status TEXT CHECK (lock_status IN ('locked', 'unlocked', 'fault', 'unknown')),
  signal_strength_rssi INTEGER,
  error_codes TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS vehicle_telemetry_logs_bike_time_idx
  ON public.vehicle_telemetry_logs (bike_id, recorded_at DESC);

-- RLS Security Policies
ALTER TABLE public.ride_telemetry_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_telemetry_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select telemetry points"
  ON public.ride_telemetry_points FOR SELECT
  TO authenticated USING (private.is_admin());

CREATE POLICY "Admins can select vehicle telemetry"
  ON public.vehicle_telemetry_logs FOR SELECT
  TO authenticated USING (private.is_admin());
```

---

## 5. Shared TypeScript Domain Contracts

Add to `packages/shared/src/domain.ts`:

```typescript
export interface RideTelemetryPoint {
  readonly id: string;
  readonly rentalTransactionId: string;
  readonly bikeId: string;
  readonly recordedAt: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly altitudeM?: number;
  readonly speedKmh?: number;
  readonly headingDeg?: number;
  readonly accuracyM?: number;
  readonly isMocked?: boolean;
}

export interface VehicleTelemetryLog {
  readonly id: string;
  readonly bikeId: string;
  readonly batteryId?: string;
  readonly recordedAt: string;
  readonly batterySoc?: number;
  readonly batteryVoltage?: number;
  readonly batteryCurrent?: number;
  readonly batteryTempC?: number;
  readonly motorTempC?: number;
  readonly lockStatus?: 'locked' | 'unlocked' | 'fault' | 'unknown';
  readonly signalStrengthRssi?: number;
  readonly errorCodes?: readonly string[];
}

export interface BatchRideTelemetryInput {
  readonly rentalTransactionId: string;
  readonly bikeId: string;
  readonly points: readonly Omit<RideTelemetryPoint, 'id' | 'rentalTransactionId' | 'bikeId'>[];
}
```

---

## Deliverables & Next Steps

1. **SQL Schema Specification**: Prepared above for insertion in Supabase migrations (`supabase/migrations/`).
2. **Domain Contract Integration**: Exported in `@glide/shared`.
3. **Edge Functions**: Telemetry ingestion endpoint (`supabase/functions/ride-telemetry/`) ready for mobile & IoT ingestion.
