# Lamphun Smart Green Mobility Platform

_Converted from `Lamphun_Smart_Green_Mobility_Software_Feature_Outline.docx`._

Software Development Feature Outline and Phased Delivery Plan

Purpose: This outline extracts the software-development requirements from the supplied project documents and organizes them into a practical delivery plan. Phase 1 contains the must-have features needed to operate the 100 e-bike service safely, auditably, and continuously. Phase 2 contains enhancements that should be added after real operational data and user behavior are available.

| Guiding principle: The documents consistently emphasize Operation First + App Ready + No Single Point of Failure. The platform must support real service operations even if the main app is incomplete or temporarily unavailable, using Google Forms, Google Sheets, Google Drive, and manual QR payment recording as a verified fallback workflow. |
| --- |

## Source Documents Reviewed

- Functional Specification and TOR materials for Lamphun e-bike operations.
- Master Executive Summary and One-Page Strategy Map.
- Executive Blueprint for the Smart Green Mobility operating system.
- GCOO / competitor feature comparison and charging-station engineering notes.
## Expectation Extracted From The Documents

- The system is not only a customer app. It is an operating platform for rental, return, fleet status, payment evidence, station operation, maintenance, battery handling, reporting, governance, and future tourism integration.
- Every operational transaction needs an identifier and evidence trail: Rental ID, Vehicle ID, Battery ID, Payment Reference, Maintenance Log, Incident Report, photo evidence, and Audit Log.
- The MVP must support 100 e-bikes, station staff, administrators, technicians, reports, and carbon-reduction reporting by September 2026.
- The architecture must remain modular and vendor-neutral so GPS, IoT, payment, carbon, partner, and public dashboard APIs can be added later.
## Phase 1 - Must-Have Features

Recommended timeline: 29 June 2026 to 30 September 2026. Target outcome: a production-ready MVP that can launch public operations with staff workflows, fallback operations, traceable payment evidence, maintenance controls, and core dashboards.

| Feature Area | Required Capability | Phase 1 Acceptance Expectation |
| --- | --- | --- |
| Customer and consent management | Registration, identity/profile record, rental history, PDPA consent, blacklist/suspend status. | Users can be registered, verified by staff where needed, suspended if required, and linked to rental records. |
| Fleet registry and QR asset control | Register each e-bike, assign Vehicle ID and QR code, manage type/category, current station, and operational state. | All 100 e-bikes have unique IDs, QR labels, and states: available, reserved, rented, charging, maintenance, out of service. |
| Rental check-out/check-in | Rental ID generation, pre-use inspection, battery level capture, photo evidence, return inspection, distance used, damage report. | Staff can complete rental and return flows without losing required evidence, including when fallback forms are used. |
| Payment reference and reconciliation | Thai QR / PromptPay reference capture, credit card/cash record, receipt reference, payment status verification. | Daily revenue can be reconciled against rentals; payment exceptions are visible and reviewable. |
| Battery and charging-room management | Battery ID registry, battery swap log, charge status, abnormal battery flag, charging-room operating record. | Each battery movement and charging status can be traced to vehicle, staff action, and time. |
| Maintenance and spare parts control | Preventive maintenance schedule, repair work orders, maintenance board, repair history, parts in/out, low-stock alert. | Unavailable vehicles are traceable to a work order, PM compliance can be reported, and parts usage is auditable. |
| Incident management | Accident, breakdown, lost vehicle, customer complaint, photo/document attachments, incident status. | Incidents can be recorded, assigned, followed up, and included in operational reports. |
| Staff roles and permissions | Administrator, project operations manager, assistant operations manager, station administrator, technician roles. | Users only access functions appropriate to their operational responsibility. |
| Dashboard and reporting MVP | Operations, fleet availability, utilization, daily/monthly rental, maintenance, revenue, incident, and carbon reports. | Managers can review service status, revenue, exceptions, and operational KPIs every day. |
| Carbon reduction report | Distance accumulation and estimated carbon reduction using conservative assumptions, daily/monthly/yearly reporting. | Carbon claims are evidence-based and exportable for future ESG or carbon-credit reporting. |
| Fallback workflow | Google Forms for start rental, return vehicle, incident report; Google Sheets master log; Google Drive photo evidence; manual QR payment log. | Service continues if the app or dashboard is unavailable, and fallback data can later be reconciled into the main system. |
| Audit and export | Searchable records, export reports, immutable timestamps where feasible, staff activity trail, exception logs. | Every transaction can be explained during internal or government review. |

### Phase 1 Delivery Timeline

| Work Package | Dates | Deliverables |
| --- | --- | --- |
| Weeks 1-2: Discovery and operating model lock | 29 June-12 July 2026 | Confirm station workflows, user roles, data model, report definitions, fallback forms, acceptance criteria, and launch KPIs. |
| Weeks 3-5: Core platform build | 13 July-2 August 2026 | Build customer, fleet, rental, payment reference, staff permissions, and database foundations. |
| Weeks 6-7: Operations modules | 3-16 August 2026 | Build maintenance, battery, incident, spare parts, QR labels, evidence capture, and fallback workflow links. |
| Weeks 8-9: Dashboard, reports, and reconciliation | 17-30 August 2026 | Build daily/monthly reports, dashboard MVP, carbon estimate, revenue reconciliation, exports, and audit views. |
| Weeks 10-11: Pilot and staff readiness | 31 August-13 September 2026 | Run station pilot, train administrators and technicians, test app outage scenarios, reconcile fallback records. |
| Weeks 12-13: Launch hardening | 14-30 September 2026 | Fix pilot defects, complete security and data checks, finalize SOPs, freeze launch scope, and prepare go-live support. |

## Phase 2 - Enhancements

Recommended timeline: 1 October 2026 to 31 March 2027. Target outcome: use live operating data to improve customer experience, integrate connected fleet data where hardware/API readiness is proven, and expand into tourism, executive dashboards, and optimization.

| Enhancement Area | Capability | Suggested Timing |
| --- | --- | --- |
| Customer mobile experience | Self-service booking, route map, notifications, rental reminders, customer feedback, improved UX. | October-November 2026 |
| Tourism promotion | Green Passport, digital stamps, Green Stay hotel voucher flow, partner route, QR check-in, route completion badges. | November-December 2026 |
| Connected fleet integrations | GPS location, trip history, smart lock / IoT integration, geofence alerts, battery monitoring where vendor APIs exist. | December 2026-January 2027 |
| Advanced maintenance and battery analytics | Maintenance alerts, repeat failure report, technician performance report, battery health, battery rotation optimization. | January-February 2027 |
| Expanded dashboard suite | Executive, operations, fleet, maintenance, financial, tourism, carbon, and smart-city mobility dashboards. | February-March 2027 |
| Data and API layer | APIs for dashboard, partner integrations, IoT, payment status, carbon reporting, and selected public dashboard views. | February-March 2027 |
| Optimization and AI-assisted decision support | Demand forecast, fleet rebalancing recommendation, predictive maintenance, dynamic staffing, tourism recommendation. | March 2027 onward |

### Phase 2 Entry Criteria

- Phase 1 rental, return, payment reference, maintenance, battery, incident, and report workflows are stable in live use.
- Data completeness is high enough to support reliable dashboards and analytics.
- Staff can operate both the main system and backup workflow without supervision.
- Connected-fleet vendors confirm usable APIs, data fields, costs, and support model before integration investment.
- Carbon calculations remain conservative and supported by actual distance or validated proxy data.
## Recommended Product Backlog Structure

| Backlog Stream | Scope |
| --- | --- |
| Core Operations | Customer, fleet, rental, return, payment, station, staff, evidence, fallback workflows. |
| Asset Reliability | Battery, maintenance, spare parts, PM schedule, repair, downtime, station readiness. |
| Governance and Reporting | Dashboards, daily/monthly reports, exports, audit log, SLA/KPI, exception monitoring. |
| Customer and Tourism | Mobile UX, route map, booking, green passport, hotel/partner campaigns, vouchers. |
| Connected Mobility | GPS, IoT, smart lock, geofence, battery monitoring, API integrations. |
| Insights and Optimization | Carbon dashboard, heat map, demand forecast, rebalancing, predictive maintenance. |

## Delivery Risks To Control

- Do not let mobile-app polish delay the operational MVP; staff workflows and fallback records are launch-critical.
- Do not connect IoT or GPS before the project has confirmed vendor API access, data reliability, battery impact, and support responsibility.
- Do not make carbon or ESG claims beyond the evidence captured by rentals, distance, battery, and route data.
- Do not bind the platform to a single vehicle or app vendor; keep IDs, APIs, exports, and data ownership under the project model.
- Do not treat Google Workflow as an afterthought; it must be tested as a real continuity plan.
## Definition Of Done For Phase 1

- All 100 e-bikes and batteries are registered with IDs and operational statuses.
- Staff can perform check-out, check-in, payment reference capture, incident report, maintenance work order, and battery swap from the main system.
- The same essential records can be captured through backup Google workflows during outage simulation.
- Daily report, monthly report, revenue reconciliation, fleet availability, maintenance, incident, and carbon reduction reports can be exported.
- Audit records can trace vehicle, customer, payment, staff, battery, maintenance, and incident actions.
- Operations, station administrators, and technicians complete training and pilot acceptance before public launch.
