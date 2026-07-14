# RFP Database Schema Diff — Supabase Current vs. New RFP Requirements

Generated: 2026-07-02

## Sources reviewed

### New/RFP requirement sources

- `docs/documentation/database/E-Bike Operation Database Tables.xlsx.md`
  - Markdown extraction of the workbook's `index` sheet and per-table sheet requirements.
- `docs/documentation/E-Bike Rental MVP Phase Systems and Features.xlsx`
  - MVP feature requirements that drive the database model.
- `output/markdown/Lamphun_Smart_Green_Mobility_Software_Feature_Outline.md`
  - Existing extracted RFP/TOR narrative requirements.

### Current Supabase schema source

- `supabase/migrations/*.sql`
- `supabase/seed.sql` was reviewed only for seeded sample data and relationship intent.

> Note: this diff treats the migration files in the repo as the current Supabase schema baseline. No live hosted Supabase schema dump was present in the repo.

## Executive summary

The current Supabase schema is a Glide MVP data model with the original app tables plus the first operational tables:

1. `profiles`
2. `wallets`
3. `wallet_transactions`
4. `bikes`
5. `bike_ride_history`
6. `reward_milestones`
7. `rental_transactions`
8. `stations`
9. `staff_profiles`
10. `batteries`
11. `payments`
12. `attachments`
13. `asset_inventory`
14. `maintenance_logs`
15. `incidents`
16. `audit_logs`
17. `operational_reports`
18. `battery_charging_logs`
19. `service_areas`
20. `energy_management`

The RFP database requirement is a broader operations platform with 18 logical domains covering fleet assets, batteries, stations, rentals, payment reconciliation, maintenance, incidents, audit logs, ESG reports, energy management, staff permissions, service geofences, inventory, charging logs, and operational events. The MVP migration now implements the operational core plus reporting/infrastructure foundations, while some aggregate/event domains remain partial.

High-level delta:

- **Keep and expand:** `bikes`, `profiles`, `bike_ride_history`, `wallets`, `wallet_transactions`, `reward_milestones`.
- **Implemented by MVP migration:** batteries, stations, maintenance logs, payments, incidents, audit logs, operational reports, charging logs, inventory, service areas, energy management, staff, and generic attachments.
- **Still to normalize/expand:** user engagement aggregates, sustainability report metrics, and operational unlock/parking events.
- **Normalize app/MVP concepts:** current `bike_ride_history` partly acts as rental transaction, payment summary, carbon summary, route log, and event history. RFP requirements split these into separate auditable records.
- **Remaining evidence/governance work:** audit and attachment foundations exist, but automated audit capture and report generation are still application/workflow responsibilities.
- **Remaining infrastructure work:** charging logs and service-area polygons now exist; station telemetry ingestion, geofence enforcement, and energy/TOU aggregation still need application integration.

## Current Supabase baseline

### Existing enum types

| Type | Values | Gap vs. RFP |
| --- | --- | --- |
| `public.bike_status` | `available`, `reserved`, `in_use`, `maintenance` | RFP asks for Ready/In Use/Repair, charging, operating status, rental status, payment status, incident status, warranty status, station type/status, etc. More enums are needed. |

### Existing public tables

| Current table | Main columns | RFP coverage |
| --- | --- | --- |
| `profiles` | `id`, `first_name`, `is_admin`, timestamps | Partial `Users` / `Staff`. Missing phone, email exposure, user type, status, consent, membership ID, identity verification, student status, driver's license, station assignment, granular permissions. |
| `wallets` | `id`, `balance`, `points`, `payment_methods`, timestamps | Partial `Payments` and `User Engagement`. Missing formal payment records, payment references, slip evidence, payment status, coupons, carbon/calorie/distance accumulated. |
| `wallet_transactions` | `id`, `wallet_id`, `type`, `title`, `subtitle`, `amount`, `created_at` | Partial payment ledger. Missing rental/payment linkage, external reference, method enum, verification status, evidence file, reconciliation state, currency consistency beyond ride history. |
| `bikes` | `id`, `model`, `ride_class`, `estimated_range_km`, `top_speed_kmh`, `pricing_label`, `rate_per_minute`, `status`, `location`, `latitude`, `longitude`, `image_url`, active ride columns, timestamps | Partial `Vehicles`. Missing serial number, frame number, color, battery/device status, QR code, maintenance history, station assignment, battery linkage, GPS telemetry history, IoT lock/device metadata. |
| `bike_ride_history` | `id`, `profile_id`, `bike_id`, start/end timestamps, duration, distance, total cost, rate, billable minutes, currency, wallet transaction link, CO2 saved, start/end location, route label, payment label, route JSON, checkpoints JSON, created_at | Partial `Rental Transactions`, `Sustainability Reporting`, and `Operational Events`. Missing start/return station IDs, explicit rental status, payment ID, service fee vs. wallet transaction separation, photo evidence, incident linkage, staff/manual fallback attribution. |
| `reward_milestones` | `profile_id`, `milestone_key`, `title`, `points_awarded`, timestamps | Partial `User Engagement`. Missing carbon reduction, calories, accumulated distance, reusable reward definitions/campaigns. |
| `rental_transactions` | Canonical rental lifecycle plus compatibility projection from `bike_ride_history` | Covered `Rental Transactions` foundation. |
| `stations`, `staff_profiles`, `batteries` | Station infrastructure, staff roles, battery lifecycle and telemetry fields | Covered operational foundations. |
| `payments`, `attachments`, `asset_inventory`, `maintenance_logs`, `incidents`, `audit_logs` | Payment reconciliation, evidence, inventory, maintenance, incident, and governance records | Covered operational foundations. |
| `operational_reports`, `battery_charging_logs`, `service_areas`, `energy_management` | Report snapshots, charging telemetry, PostGIS zones, and station energy readings | Covered Phase-D database foundations; application ingestion/calculation remains. |

## Required RFP tables vs. current schema

Legend:

- **Covered**: current schema has a strong equivalent.
- **Partial**: current schema has related data but missing required fields or normalization.
- **Missing**: no current first-class table/equivalent.

| RFP required table | Current equivalent | Status | Main diff / required action |
| --- | --- | --- | --- |
| `vehicles` | `bikes` | Covered | MVP bike registry now includes serial/frame/color, QR code, battery/device status, maintenance summary, station assignment, and current battery linkage. Text IDs remain the app-facing vehicle identifiers. |
| `batteries` | `batteries` | Covered | Added battery registry with vehicle/station links, health, charge level, cycles, SOH, inspection, charging slot, sensor readings, retirement plan, and abnormal flag. |
| `users` | `profiles` + `auth.users` | Covered | MVP profile extensions now include phone, email, user type/status, registration date, consent, membership, identity verification, student status, and license reference. |
| `rental_transactions` | `rental_transactions` | Covered | Canonical rental table now exists with lifecycle, stations, payment link, service fee, route distance, evidence, and fallback reconciliation fields; it remains synchronized from ride history for compatibility. |
| `stations` | `stations` | Covered | Added station/hub/kiosk registry with GPS scalars, capacity, charging slots, operating/electricity status, power capacity, equipment inventory, and phase balance. |
| `maintenance_logs` | `maintenance_logs` | Covered | Added PM/CM work orders linked to bikes, assets, and staff with dates, parts, post-repair status, service schedule, QC, and fallback fields. |
| `payments` | `payments` + `wallet_transactions` | Covered | Added payment authority/reconciliation records while retaining wallet transactions as the balance ledger. |
| `incidents` | `incidents` | Covered | Added accident/damage/loss/breakdown/complaint records linked to rentals, bikes, users, staff, and resolution state. |
| `sustainability_reporting` | `bike_ride_history.co2_saved_kg` + `operational_reports` | Partial | Report storage now exists, but reproducible emission factors, fuel savings, total travel, and energy-consumption calculations still need dedicated metrics or report-generation logic. |
| `audit_logs` | `audit_logs` | Covered | Business audit table now exists with actor, action, entity, changed data, device/location, KPI, and evidence linkage. Automated capture remains an application concern. |
| `operational_reports` | `operational_reports` | Covered | Added report snapshots with period/type, usage statistics, utilization, availability, downtime, satisfaction, revenue, and reconciliation payloads. |
| `battery_charging_logs` | `battery_charging_logs` | Covered | Added charging/swap log with slot, battery, station, sensor readings, charge cycles, SOH, lifecycle status, and source metadata. |
| `asset_inventory` | `asset_inventory` | Covered | Added asset/spare-parts inventory with quantity, procurement, warranty, maintenance period, stock level, minimum threshold, and station link. |
| `service_areas` | `service_areas` | Covered | Added PostGIS `geography(Polygon, 4326)` boundaries, returnable/prohibited/service zone types, city, status, and spatial index. Enforcement remains application work. |
| `energy_management` | `energy_management` | Covered | Added station-linked power demand, L1/L2/L3 phase readings, TOU period/rate, currency, source, and metadata fields. Aggregation/utility ingestion remains application work. |
| `staff` | `staff_profiles` + `profiles.is_admin` | Covered | Added staff roles, permissions JSON, station assignment, and status. `profiles.is_admin` remains for compatibility with existing policies. |
| `user_engagement` | `wallets.points` + `reward_milestones` | Partial | Add user-level engagement metrics for eco points, carbon reduction, calories, distance accumulated; keep reward milestones as events. |
| `operational_events` | `bike_status_events` + `bike_ride_history.checkpoints` JSON | Partial | Status transitions are normalized, but unlock/parking/return/photo-proof/GPS events still need a dedicated event table. |

## Detailed table-by-table diff

### 1. `vehicles` vs. current `bikes`

Current `bikes` already supports app-facing bike availability and pricing:

- bike ID
- model/class
- range and top speed
- pricing label/rate
- status
- current text location and lat/lon
- active rider/active ride start state
- image URL

RFP adds fleet asset-management requirements:

| Required field | Current coverage | Action |
| --- | --- | --- |
| Vehicle ID | `bikes.id` | Keep as business identifier or migrate to UUID PK + `vehicle_code`. |
| Serial Number | Missing | Add `serial_number`. |
| Frame Number | Missing | Add `frame_number`. |
| Model | `bikes.model` | Covered. |
| Color | Missing | Add `color`. |
| GPS Coordinates | `latitude`, `longitude` | Partial. Consider `geography(Point, 4326)` generated/primary field plus scalar cache if needed. |
| Battery Status | Missing | Add current battery status or derive from `batteries`/telemetry. |
| QR Code | Missing | Add `qr_code` or `qr_payload`. |
| Maintenance History | Missing | Do not store as text only; implement `maintenance_logs`, optionally add summary/status on vehicle. |
| Status Ready/In Use/Repair | `bike_status` | Partial. Add values such as `ready`, `repair`, `charging`, `out_of_service` or map existing values. |
| Device Status | Missing | Add IoT/device status fields or `vehicle_devices` table later. |

### 2. `batteries`

No current table. This is a launch-critical RFP gap because Phase 1 expects battery IDs, battery swap logs, charge status, abnormal battery flags, and charging-room records.

Recommended minimum columns:

- `id uuid primary key`
- `battery_code text unique not null`
- `vehicle_id` / `bike_id` foreign key, nullable for batteries in storage or charging cabinet
- `status` enum
- `charge_level numeric(5,2)`
- `charge_cycles integer`
- `state_of_health numeric(5,2)`
- `last_inspection_date date`
- `charger_id` or `charging_slot_id`
- `voltage numeric(8,2)`
- `current numeric(8,2)`
- `temperature numeric(5,2)`
- `retirement_plan text`
- timestamps

### 3. `users` vs. `profiles`

Current `profiles` has only `first_name` and `is_admin`, relying on Supabase Auth for identity. RFP requires an operational customer record.

Add to `profiles` or create `users`/`customers` table:

- name fields or full name
- phone
- email mirror/search field if operationally required
- user type: citizen/tourist
- status: active/suspended/blacklisted/etc.
- registration date
- PDPA consent/agreement fields
- membership ID
- identity verification status
- student status
- driver's license/passport/ID verification reference

Do not store raw identity documents in table columns; store file references and verification metadata if required.

### 4. `rental_transactions` vs. `bike_ride_history`

`bike_ride_history` is currently a completed-ride history table plus route/payment summary. RFP requires the rental transaction itself, from checkout through return/reconciliation.

Current coverage:

- user/profile link
- vehicle/bike link
- start/end timestamps
- duration
- distance
- cost
- wallet transaction link
- route/checkpoints JSON
- carbon saved

Missing or weak:

- start station ID
- return station ID
- rental status lifecycle
- payment ID separate from wallet transaction
- service fee vs. total cost breakdown
- route distance vs. reported distance
- photo evidence
- fallback/manual source
- staff operator
- pre-use and return inspection linkage

Recommended: introduce `rental_transactions` as canonical, then either retire/rename `bike_ride_history` or make it a view/history projection.

### 5. `stations`

No current station table. Required for operations, capacity, return zones, charging slots, electricity status, and reports.

Minimum additions:

- `id uuid primary key`
- `station_name text not null`
- `location geography(Point, 4326)`
- `station_type` enum: hub/kiosk/mobile_booth/etc.
- `capacity integer`
- `charging_slot_count integer`
- `operating_status` enum
- `electricity_status` enum
- `power_capacity numeric(10,2)`
- `equipment_inventory jsonb` or relation to `asset_inventory`
- `phase_balance jsonb`

### 6. `maintenance_logs`

No current maintenance model. RFP expects PM/CM logs, parts used, technician assignment, repair SLA, post-repair status, next service schedule, and quality check status.

This should be a first-class table linked to `vehicles`, `asset_inventory`, and `staff`.

### 7. `payments` vs. `wallet_transactions`

`wallet_transactions` is a wallet ledger, not a full payment/reconciliation table.

RFP requires:

- payment/rental linkage
- QR/gateway/credit-card/manual slip method
- external payment reference
- payment time
- status/verification
- evidence file/slip
- coupon ID
- reconciliation state

Recommended: create `payments`; keep `wallet_transactions` for balance mutations. Link `payments.wallet_transaction_id` when a successful payment also changes wallet state.

### 8. `incidents`

No current table. Add incident records linked to rental/vehicle/user/staff with evidence and resolution fields.

RFP incident types include accident, damage, and loss. The feature outline also mentions breakdowns and complaints, so the enum should allow operational expansion.

### 9. `sustainability_reporting`

Current table-level support is limited to `bike_ride_history.co2_saved_kg`. RFP needs aggregate reports with emission factor, trip count, total travel distance, fuel savings, and energy consumption.

Recommended: store report snapshots if reports must be reproducible after formulas/factors change.

### 10. `audit_logs`

No current business audit table. RLS and database policies protect data but do not provide a human-readable operational audit trail.

Add append-only audit records with:

- actor/user/staff/role
- action
- entity/table/entity ID
- before/after or patch JSON
- timestamp
- device/location/IP/user agent if available
- evidence link

### 11. `operational_reports`

No current report snapshot table. RFP asks for daily revenue, payment reconciliation, utilization, service downtime, satisfaction score, and app availability.

Recommended: implement either materialized views plus scheduled snapshots, or a report table keyed by report date/type.

### 12. `battery_charging_logs`

No current charging log. This should link batteries, charging slots/stations, and sensor readings.

This table is separate from `batteries` because readings are time-series/log events.

### 13. `asset_inventory`

No current asset/spare parts table. Required for spare-parts control, station assets, and minimum stock alerting.

### 14. `service_areas`

No current geofence table. RFP requires returnable/prohibited zones. Add PostGIS support and use polygons.

Recommended columns:

- `id uuid primary key`
- `name text`
- `city_name text`
- `zone_type` enum
- `boundary geography(Polygon, 4326)` or geometry with SRID 4326
- status/timestamps

### 15. `energy_management`

No current energy/TOU table. RFP charging documents require off-peak scheduling, power demand, phase distribution, and applied rate tracking.

This should likely link to `stations`.

### 16. `staff` vs. `profiles.is_admin`

Current `profiles.is_admin` gives only a boolean. RFP needs roles and permissions:

- Admin
- Manager
- Technician
- station assignment
- permissions

Recommended: add `staff_profiles` or `staff` linked to `profiles.id`, with `role`, `permissions jsonb`, and `station_id`.

### 17. `user_engagement` vs. `wallets` / `reward_milestones`

Current points exist in `wallets.points`; milestone events exist in `reward_milestones`.

RFP adds:

- eco-points
- carbon reduction
- calories burned
- distance accumulated

Recommended: add a per-user aggregate table or materialized view. Keep `reward_milestones` as event history.

### 18. `operational_events`

Current `bike_ride_history.checkpoints` stores route checkpoints as JSON. RFP needs auditable operational events such as unlock and parking with GPS and photo proof.

Recommended: add normalized event table:

- `id uuid primary key`
- `rental_transaction_id`
- `vehicle_id`
- `user_id`
- `staff_id`
- `event_type`
- `gps geography(Point, 4326)`
- `photo_proof_url`
- `created_at`
- `metadata jsonb`

## Recommended migration plan

### Phase A — Foundation and compatibility

1. Add PostGIS/geography support if service areas and GPS points will use native geography types.
2. Keep existing tables to avoid breaking the mobile/web MVP.
3. Add compatibility columns to `bikes` and `profiles` for RFP-required fields that are direct extensions.
4. Add new enum types for statuses/methods, or use constrained text during rapid MVP build if enum churn is expected.

### Phase B — Operational core tables

Add these first because they are required for launch operations and daily workflows:

1. `stations`
2. `batteries`
3. `rental_transactions`
4. `payments`
5. `maintenance_logs`
6. `incidents`
7. `staff`
8. `asset_inventory`

### Phase C — Evidence, audit, and fallback reconciliation

1. Add `audit_logs`.
2. Add evidence URL fields or a generic `attachments` table for photos/slips/documents.
3. Add source/fallback fields to rental, payment, incident, and maintenance tables so Google Forms/Sheets fallback records can be reconciled.

### Phase D — Infrastructure, reports, and ESG

The MVP migration `20260714120000_add_phase_d_reporting_infrastructure.sql` now provides the database foundations for the first five items:

1. `battery_charging_logs`.
2. `service_areas` using PostGIS geography polygons.
3. `energy_management`.
4. `operational_reports` report snapshots.
5. `sustainability_reporting` storage is partially represented through report payloads plus existing ride carbon values.

Remaining Phase-D work:

6. Add `user_engagement` aggregates.
7. Add `operational_events` for unlock/parking/photo-proof events.
8. Add application jobs/ingestion for report, energy, charging, geofence, and ESG calculations.

## Suggested new/changed schema inventory

### Existing tables to retain and expand

| Current table | Suggested direction |
| --- | --- |
| `bikes` | Retain initially; either rename to `vehicles` later or add `vehicle_code`/RFP fields and document it as the vehicle registry. |
| `profiles` | Expand for customer profile and consent; add separate `staff` for operational roles. |
| `wallets` | Retain as wallet balance/points aggregate. |
| `wallet_transactions` | Retain as financial ledger; link to `payments` where applicable. |
| `bike_ride_history` | Keep as historical ride projection during transition; introduce canonical `rental_transactions`. |
| `reward_milestones` | Retain as engagement event history; add engagement aggregates separately. |

### New tables required by RFP

| Priority | Table | Reason |
| --- | --- | --- |
| Critical | `stations` | Station capacity, return/charging operations, staff assignment. |
| Critical | `batteries` | Battery lifecycle, charge status, SOH, safety. |
| Critical | `rental_transactions` | Canonical rental lifecycle and audit linkage. |
| Critical | `payments` | Payment reference, slip/gateway verification, reconciliation. |
| Critical | `staff` | Roles/permissions/station assignment beyond `is_admin`. |
| Critical | `maintenance_logs` | PM/CM compliance, repair SLA, parts and technician traceability. |
| High | `incidents` | Accident/damage/loss reporting and resolution. |
| High | `audit_logs` | Governance and traceability. |
| High | `asset_inventory` | Spare parts and station/fleet asset controls. |
| High | `battery_charging_logs` | Charging safety and battery telemetry history. |
| High | `operational_events` | Unlock/parking/photo-proof event trail. |
| High | `service_areas` | Returnable/prohibited zones and geofencing. |
| Medium/High | `sustainability_reporting` | ESG/carbon reports and reproducible calculations. |
| Medium/High | `operational_reports` | Daily/monthly KPI snapshots. |
| Medium | `energy_management` | TOU rate and phase/power monitoring. |
| Medium | `user_engagement` | Eco-points/carbon/calorie/distance aggregates. |

## Open design decisions before implementation

1. **Naming:** use RFP names (`vehicles`, `users`) or keep app names (`bikes`, `profiles`) and document mappings?
2. **Primary keys:** current `bikes.id` is text (`G-104`). RFP data types imply UUID for most references. Decide whether to keep business IDs as PKs or introduce UUID PKs plus unique public codes.
3. **PostGIS:** Resolved for service areas: the Phase-D migration enables the Supabase PostGIS extension in `extensions` and stores `service_areas.boundary` as `geography(Polygon, 4326)`. Point columns remain scalar in the MVP.
4. **Files/evidence:** Resolved for the MVP: use the normalized `attachments` table, with table-specific URL fields retained where already present.
5. **Payment model:** separate external payment intent/receipt records from wallet balance movements.
6. **Reports:** Resolved for the MVP foundation: use `operational_reports` snapshots. Add generated views/jobs later for the metrics and formula versioning required by formal reporting.
7. **Offline fallback reconciliation:** add source fields such as `source_system`, `fallback_form_id`, `import_batch_id`, `entered_by_staff_id`, and `reconciled_at` to operational tables.

## Implementation checklist

- [ ] Create migration for enum/status foundations.
- [ ] Create migration for `stations`, `staff`, and profile/customer extensions.
- [x] Create migration for `batteries` and `battery_charging_logs`.
- [x] Create migration for canonical `rental_transactions` and backfill from `bike_ride_history` where possible.
- [x] Create migration for `payments` and link/backfill from `wallet_transactions` where possible.
- [x] Create migration for `maintenance_logs`, `asset_inventory`, and `incidents`.
- [x] Create migration for `audit_logs` and evidence/attachment handling.
- [ ] Create migration for normalized `operational_events`.
- [x] Create migration for `service_areas` and PostGIS/geography columns.
- [x] Create migration for `operational_reports` and `energy_management`.
- [ ] Add dedicated `sustainability_reporting` metrics and `user_engagement` aggregates.
- [x] Add RLS policies for every new table, especially staff/admin access vs. rider-owned records.
- [ ] Update mobile/web data access code after canonical tables are introduced.
- [ ] Add seed data for one station, one staff admin, sample batteries, sample payments, and sample rental transactions.

## Bottom line

The MVP migration now covers the RFP's operational core: fleet extensions, users, stations, batteries, rentals, payments/reconciliation, staff, maintenance, incidents, audit foundations, inventory, charging logs, service-area polygons, energy readings, and report snapshots. It is substantially beyond the original lightweight ride/wallet schema while preserving the existing app-facing tables and compatibility sync.

It is not yet a complete RFP reporting/event implementation. The remaining material gaps are dedicated user-engagement aggregates, reproducible sustainability metrics, normalized unlock/parking/photo-proof operational events, and the application workflows that ingest telemetry, enforce geofences, calculate reports, and reconcile offline records. The new migration is therefore an additive Phase-D foundation, not a claim that all RFP workflows are complete.
