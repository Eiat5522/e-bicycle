# E-Bike Operation Database Tables.xlsx

## index

| Col 1 | Col 2 | Col 3 | Col 4 | Col 5 | Col 6 |
| --- | --- | --- | --- | --- | --- |
| Table Name | Primary Key | Key Attributes | Module Type | Description | Source |
| Vehicles | Vehicle ID | Serial Number, Frame Number, Model, Color, GPS Coordinates, Battery Status, QR Code, Maintenance History, Status (Ready/In Use/Repair), Device Status | Fleet | Master register and telemetry database for all e-bikes in the fleet, including technical specifications, real-time location, and operational readiness. | 1, 2, 3, 4, 5, 6, 7, 8, 9 |
| Batteries | Battery ID | Vehicle ID, Battery Status, Charge Level, Charge Cycles, State of Health (SOH), Last Inspection Date, Health History, Charger ID, Voltage, Current, Temperature, Retirement Plan | Fleet | Tracks the health, status, and lifecycle of individual battery units, monitoring electrical parameters and charging history. | 1, 4, 5, 7, 8, 9 |
| Users | User ID | Name, Phone, Email, User Type (Citizen/Tourist), Status, Registration Date, Consent/Agreement, Membership ID, Identity Verification, Student Status, Driver's License | Digital | Stores comprehensive information about registered public users, including engagement data, authentication, and service access rights. | 1, 2, 3, 4, 5, 6, 7, 9 |
| Rental Transactions | Transaction ID | User ID, Vehicle ID, Start Station, Return Station, Start Time, Return Time, Duration, Distance, Rental Status, Payment ID, Service Fee, Route Distance, Photo Evidence | Operation | Core operational table recording every rental event from start to completion, linking users to specific vehicles and movement statistics. | 1, 2, 3, 4, 5, 7, 8 |
| Stations | Station ID | Station Name, Location (GPS), Type (Hub/Kiosk), Capacity, Charging Slot Count, Operating Status, Electricity Status, Power Capacity, Equipment Inventory, Phase Balance | Infrastructure | Defines physical service locations, charging zones, and hubs, managing infrastructure capacity, security, and electrical stability. | 1, 2, 3, 4, 5, 9 |
| Maintenance Logs | Maintenance ID | Vehicle ID, Asset ID, Repair Type (PM/CM), Date Reported, Date Finished, Parts Used, Technician ID, Post-Repair Status, Next Service Schedule, Quality Check Status | Operation | Tracks the maintenance lifecycle, repair history, and preventive maintenance compliance for the fleet and infrastructure. | 1, 2, 3, 4, 5, 7, 8, 9 |
| Payments | Payment ID | Rental ID, Transaction ID, Amount, Payment Method (QR/Gateway/Credit Card), Payment Reference, Payment Time, Payment Status, Evidence File (Slip), Coupon ID | Operation | Records financial transactions and payment status associated with rentals and wallet activities for reconciliation and audit. | 1, 4, 6, 7 |
| Incidents | Incident ID | Rental ID, Vehicle ID, User ID, Incident Type (Accident/Damage/Loss), Description, Photo Evidence, Status, Resolution Status | Operation | Records accidents, damages, or abnormalities occurring during vehicle use for insurance and operational reporting. | 1, 4, 7 |
| Sustainability Reporting | Report ID | Estimated Distance, Emission Factor, Trip Count, Carbon Reduced ( $kgCO_{2}e$ ), Fuel Savings, Total Travel Distance, Energy Consumption | Governance | Aggregated data for reporting environmental impact, ESG metrics, and carbon reduction goals. | 1, 2, 3, 7 |
| Audit Logs | Audit ID | User Role, Action Performed, Data Changed, Timestamp, Device/Location, KPI Achievement, Evidence File Link | Governance | Security and governance logs recording system access, data changes, and KPI tracking for transparency and accountability. | 1, 4 |
| Operational Reports | Report ID | Usage Statistics, Utilization Rate, App Availability, Service Downtime, User Satisfaction Score, Daily Revenue, Payment Reconciliation | Governance | Consolidated management table for evaluating project KPIs, financial summaries, and strategic compliance. | 2, 5 |
| Battery Charging Logs | Log ID | Slot ID, Battery ID, Voltage, Current, Temperature, Charge Cycles, State of Health (SOH), Battery Swap Logs | Infrastructure | Tracks real-time charging activity at stations, monitoring electrical parameters and individual battery swap events. | 7, 8 |
| Asset Inventory | Asset ID | Item Description, Quantity, Procurement Date, Warranty Status, Maintenance Period, Stock Level, Minimum Threshold | Governance | Inventory management for physical assets including IT equipment, spare parts, and station furniture. | 3, 7 |
| Service Areas | Zone ID | Boundary coordinates, Zone Type (Returnable/Prohibited), City Name | Infrastructure | Defines the geographical boundaries for fleet operations and allowed parking zones. | 6 |
| Energy Management | Report ID | Timestamp, Total Power Demand, Phase Distribution ( $L1/L2/L3$ ), TOU Rate Period, Applied TOU Rate | Governance | Monitors energy consumption, utility costs, and electrical stability across charging stations. | 8, 9 |
| Staff | Staff ID | Name, Role (Admin/Manager/Technician), Permissions, Station Assignment | Governance | Manages system access levels, permissions, and physical station assignments for personnel. | 7 |
| User Engagement | Reward ID | Eco-Points, Carbon Reduction ( $kg$ ), Calories Burned, Distance Accumulated | Governance | Tracks user-specific loyalty metrics, environmental impact points, and engagement rewards. | 6 |
| Operational Events | Event ID | GPS coordinates, Event Type (Unlock/Parking), Vehicle ID, Photo Proof | Operation | Tracks granular operational logs such as vehicle unlocking events and parking compliance. | 6 |
| Ride Telemetry Points | Telemetry Point ID | Rental Transaction ID, Vehicle ID, Recorded At, Location, Altitude, Speed, Heading, Accuracy, Is Mocked | Operation | High-frequency GPS telemetry collected during active rides for route replay, speed/elevation analysis, and geofence compliance. | Telemetry Schema Research |
| Vehicle Telemetry Logs | Telemetry Log ID | Vehicle ID, Battery ID, Recorded At, Battery State of Charge (SoC), Voltage, Current, Battery Temperature, Motor Temperature, Lock Status, Signal Strength RSSI (dBm), Error Codes | Fleet | Time-series IoT telemetry from the bike controller and lock for fleet health, battery monitoring, diagnostics, and connectivity status. | Telemetry Schema Research |
| Station Energy Telemetry | Energy Telemetry ID | Station ID, Recorded At, Total Power, L1/L2/L3 Power, Active Charging Slots, Grid Voltage | Infrastructure | Time-series charging-station and electrical telemetry for energy monitoring, phase balance, and charging capacity analysis. | Telemetry Schema Research |

## vehicles

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| Serial Number | VARCHAR(100) |  |  |
| Frame Number | VARCHAR(100) |  |  |
| Model | VARCHAR(100) |  |  |
| Color | VARCHAR(50) |  |  |
| GPS Coordinates | GEOGRAPHY(POINT) |  |  |
| Battery Status | ENUM |  |  |
| QR Code | VARCHAR(255) |  |  |
| Maintenance History | TEXT |  |  |
| Status (Ready/In Use/Repair) | ENUM |  |  |
| Device Status | ENUM |  |  |

## batteries

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| Vehicle ID | UUID |  |  |
| Battery Status | ENUM |  |  |
| Charge Level | DECIMAL(5,2) |  |  |
| Charge Cycles | INTEGER |  |  |
| State of Health (SOH) | DECIMAL(5,2) |  |  |
| Last Inspection Date | DATE |  |  |
| Health History | TEXT |  |  |
| Charger ID | UUID |  |  |
| Voltage | DECIMAL(8,2) |  |  |
| Current | DECIMAL(8,2) |  |  |
| Temperature | DECIMAL(5,2) |  |  |
| Retirement Plan | TEXT |  |  |

## users

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| Name | VARCHAR(255) |  |  |
| Phone | VARCHAR(30) |  |  |
| Email | VARCHAR(255) |  |  |
| User Type (Citizen/Tourist) | ENUM |  |  |
| Status | ENUM |  |  |
| Registration Date | TIMESTAMP |  |  |
| Consent/Agreement | BOOLEAN |  |  |
| Membership ID | UUID |  |  |
| Identity Verification | ENUM |  |  |
| Student Status | BOOLEAN |  |  |
| Driver's License | VARCHAR(100) |  |  |

## rental_transactions

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| User ID | UUID |  |  |
| Vehicle ID | UUID |  |  |
| Start Station | UUID |  |  |
| Return Station | UUID |  |  |
| Start Time | TIMESTAMP |  |  |
| Return Time | TIMESTAMP |  |  |
| Duration | INTEGER |  |  |
| Distance | DECIMAL(10,2) |  |  |
| Rental Status | ENUM |  |  |
| Payment ID | UUID |  |  |
| Service Fee | DECIMAL(10,2) |  |  |
| Route Distance | DECIMAL(10,2) |  |  |
| Photo Evidence | TEXT |  |  |

## stations

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| Station Name | VARCHAR(255) |  |  |
| Location (GPS) | GEOGRAPHY(POINT) |  |  |
| Type (Hub/Kiosk) | ENUM |  |  |
| Capacity | INTEGER |  |  |
| Charging Slot Count | INTEGER |  |  |
| Operating Status | ENUM |  |  |
| Electricity Status | ENUM |  |  |
| Power Capacity | DECIMAL(10,2) |  |  |
| Equipment Inventory | TEXT |  |  |
| Phase Balance | JSON |  |  |

## maintenance_logs

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| Vehicle ID | UUID |  |  |
| Asset ID | UUID |  |  |
| Repair Type (PM/CM) | ENUM |  |  |
| Date Reported | TIMESTAMP |  |  |
| Date Finished | TIMESTAMP |  |  |
| Parts Used | TEXT |  |  |
| Technician ID | UUID |  |  |
| Post-Repair Status | ENUM |  |  |
| Next Service Schedule | DATE |  |  |
| Quality Check Status | ENUM |  |  |

## payments

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| Rental ID | UUID |  |  |
| Transaction ID | UUID |  |  |
| Amount | DECIMAL(10,2) |  |  |
| Payment Method (QR/Gateway/Credit Card) | ENUM |  |  |
| Payment Reference | VARCHAR(255) |  |  |
| Payment Time | TIMESTAMP |  |  |
| Payment Status | ENUM |  |  |
| Evidence File (Slip) | TEXT |  |  |
| Coupon ID | UUID |  |  |

## incidents

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| Rental ID | UUID |  |  |
| Vehicle ID | UUID |  |  |
| User ID | UUID |  |  |
| Incident Type (Accident/Damage/Loss) | ENUM |  |  |
| Description | TEXT |  |  |
| Photo Evidence | TEXT |  |  |
| Status | ENUM |  |  |
| Resolution Status | ENUM |  |  |

## sustainability_reporting

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| Estimated Distance | DECIMAL(10,2) |  |  |
| Emission Factor | DECIMAL(10,4) |  |  |
| Trip Count | INTEGER |  |  |
| Carbon Reduced ( $kgCO_{2}e$ ) | DECIMAL(10,2) |  |  |
| Fuel Savings | DECIMAL(10,2) |  |  |
| Total Travel Distance | DECIMAL(12,2) |  |  |
| Energy Consumption | DECIMAL(12,2) |  |  |

## audit_logs

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| User Role | VARCHAR(100) |  |  |
| Action Performed | VARCHAR(255) |  |  |
| Data Changed | JSON |  |  |
| Timestamp | TIMESTAMP |  |  |
| Device/Location | VARCHAR(255) |  |  |
| KPI Achievement | DECIMAL(5,2) |  |  |
| Evidence File Link | TEXT |  |  |

## operational_reports

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| Usage Statistics | JSON |  |  |
| Utilization Rate | DECIMAL(5,2) |  |  |
| App Availability | DECIMAL(5,2) |  |  |
| Service Downtime | INTEGER |  |  |
| User Satisfaction Score | DECIMAL(3,2) |  |  |
| Daily Revenue | DECIMAL(12,2) |  |  |
| Payment Reconciliation | ENUM |  |  |

## battery_charging_logs

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| Slot ID | UUID |  |  |
| Battery ID | UUID |  |  |
| Voltage | DECIMAL(8,2) |  |  |
| Current | DECIMAL(8,2) |  |  |
| Temperature | DECIMAL(5,2) |  |  |
| Charge Cycles | INTEGER |  |  |
| State of Health (SOH) | DECIMAL(5,2) |  |  |
| Battery Swap Logs | TEXT |  |  |

## asset_inventory

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| Item Description | TEXT |  |  |
| Quantity | INTEGER |  |  |
| Procurement Date | DATE |  |  |
| Warranty Status | ENUM |  |  |
| Maintenance Period | VARCHAR(100) |  |  |
| Stock Level | INTEGER |  |  |
| Minimum Threshold | INTEGER |  |  |

## service_areas

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| Boundary coordinates | GEOGRAPHY(POLYGON) |  |  |
| Zone Type (Returnable/Prohibited) | ENUM |  |  |
| City Name | VARCHAR(100) |  |  |

## energy_management

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| Timestamp | TIMESTAMP |  |  |
| Total Power Demand | DECIMAL(12,2) |  |  |
| Phase Distribution ( $L1/L2/L3$ ) | JSON |  |  |
| TOU Rate Period | ENUM |  |  |
| Applied TOU Rate | DECIMAL(10,4) |  |  |

## staff

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| Name | VARCHAR(255) |  |  |
| Role (Admin/Manager/Technician) | ENUM |  |  |
| Permissions | JSON |  |  |
| Station Assignment | UUID |  |  |

## user_engagement

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| Eco-Points | INTEGER |  |  |
| Carbon Reduction ( $kg$ ) | DECIMAL(10,2) |  |  |
| Calories Burned | DECIMAL(10,2) |  |  |
| Distance Accumulated | DECIMAL(12,2) |  |  |

## operational_events

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| GPS coordinates | GEOGRAPHY(POINT) |  |  |
| Event Type (Unlock/Parking) | ENUM |  |  |
| Vehicle ID | UUID |  |  |
| Photo Proof | TEXT |  |  |

## ride_telemetry_points

High-frequency GPS telemetry collected during active rentals. Recommended cadence is every 5–10 seconds while moving and approximately every 30 seconds while stationary. Raw points should be retained for 30 days and rolled up into the completed rental route and checkpoints.

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| Telemetry Point ID | UUID | Unique telemetry point identifier | `8f4e2c6d-8a0e-4f32-bf4d-2b8b5c9b5a10` |
| Rental Transaction ID | UUID | Active rental session associated with the point | `7f2a9d14-2c0b-4c49-9d50-9a1d4f7e2b30` |
| Vehicle ID | TEXT | Fleet vehicle identifier | `G-104` |
| Recorded At | TIMESTAMPTZ | Sensor timestamp in UTC | `2026-07-22T08:30:05Z` |
| Location | GEOGRAPHY(POINT, 4326) | Geographic position; longitude first in PostGIS representation | `POINT(98.9853 18.7883)` |
| Altitude (m) | NUMERIC(6,2) | Altitude above sea level | `312.45` |
| Speed (km/h) | NUMERIC(5,2) | Instantaneous travel speed | `18.60` |
| Heading (deg) | NUMERIC(5,2) | Compass direction from 0 to less than 360 degrees | `127.50` |
| Accuracy (m) | NUMERIC(5,2) | GPS accuracy radius / estimated horizontal accuracy | `4.20` |
| Is Mocked | BOOLEAN | Anti-fraud flag indicating a likely simulated or mock GPS source | `false` |

## vehicle_telemetry_logs

Low-to-medium frequency telemetry from the vehicle IoT lock/controller. Recommended cadence is every 30 seconds during an active ride and every 15 minutes while parked. Raw logs should be retained for 60 days, with hourly averages retained for long-term fleet-health reporting.

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| Telemetry Log ID | UUID | Unique vehicle telemetry log identifier | `2d5c0f12-3b6e-4a22-a0b4-7c9b1f8e6d40` |
| Vehicle ID | TEXT | Fleet vehicle identifier | `G-104` |
| Battery ID | UUID | Battery unit associated with the reading | `b1a52df6-6e9b-4b71-90bb-1a8f0d7c2e30` |
| Recorded At | TIMESTAMPTZ | Sensor timestamp in UTC | `2026-07-22T08:30:00Z` |
| Battery State of Charge (SoC) | NUMERIC(5,2) | Remaining battery charge percentage, from 0 to 100 | `78.50` |
| Battery Voltage (V) | NUMERIC(5,2) | Total battery pack voltage | `48.20` |
| Battery Current (A) | NUMERIC(5,2) | Canonical convention: positive values indicate charging and negative values indicate discharging. Ingestion must normalize provider-specific readings to this convention before storage or aggregation. | `6.40` |
| Battery Temperature (°C) | NUMERIC(4,1) | Battery pack temperature | `31.5` |
| Motor Temperature (°C) | NUMERIC(4,1) | Motor or motor-controller temperature | `42.0` |
| Lock Status | ENUM | Physical lock state: `locked`, `unlocked`, `fault`, or `unknown` | `unlocked` |
| Signal Strength RSSI (dBm) | INTEGER | Cellular/IoT signal strength, normally approximately -120 to 0 dBm | `-67` |
| Error Codes | TEXT[] | Active IoT controller diagnostic codes | `{E_BATTERY_TEMP}` |
| Created At | TIMESTAMPTZ | Server-side ingestion timestamp | `2026-07-22T08:30:02Z` |

## station_energy_telemetry

Aggregated or phase-specific telemetry from smart charging hubs and kiosks. This complements the existing `energy_management` reporting table by preserving time-series station readings.

| Col 1 | Col 2 | Col 3 | Col 4 |
| --- | --- | --- | --- |
| Field Name | Data Type | Description | Sample Format |
| Energy Telemetry ID | UUID | Unique station energy telemetry identifier | `5c4a1d8e-0b32-4f7c-9e11-6a2b8d0f3c50` |
| Station ID | UUID | Charging station associated with the reading | `a8f10f4c-2a2f-4ad7-9c8d-3e0f2b1a6d70` |
| Recorded At | TIMESTAMPTZ | Station or ingestion timestamp in UTC | `2026-07-22T08:30:00Z` |
| Total Power (kW) | NUMERIC(8,2) | Total station power consumption | `12.40` |
| Cumulative Energy (kWh) | NUMERIC(12,3) | Monotonic cumulative energy delivered/consumed by the station. Ingestion must detect a meter reset or replacement, start a new cumulative segment, and preserve the reset event rather than treating the lower reading as negative consumption. | `1842.375` |
| Phase L1 Power (kW) | NUMERIC(8,2) | Power draw on phase L1 | `4.10` |
| Phase L2 Power (kW) | NUMERIC(8,2) | Power draw on phase L2 | `4.20` |
| Phase L3 Power (kW) | NUMERIC(8,2) | Power draw on phase L3 | `4.10` |
| Active Charging Slots | INTEGER | Slots currently supplying power | `6` |
| Grid Voltage (V) | NUMERIC(6,2) | Main grid line voltage | `230.00` |
