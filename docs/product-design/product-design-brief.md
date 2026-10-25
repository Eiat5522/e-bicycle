# Product Design Brief

## Product Promise

Lamphun Smart Green Mobility is a public green mobility operating system, not just an e-bike rental app. The product must help residents, tourists, station staff, operators, and government viewers keep a 100-bike public service running safely, transparently, and continuously.

The core promise is:

> A rider can register, rent, pay, ride, and return an e-bike with confidence; station staff can keep the service moving even when the app, internet, or payment gateway fails; operators and government stakeholders can verify what happened afterward.

## Design Principles

### Operation First

The physical service must not stop because a digital surface fails. Design every critical journey with a primary digital path and a staff-assisted fallback path.

For MVP, the staff station surface is a standalone offline-first tablet app because station staff must be able to start rentals, return bikes, record incidents, capture payment references, and save inspection evidence when internet access is unavailable.

### Safety Before Convenience

Do not let speed, payment, rewards, or visual polish override vehicle readiness, battery safety, inspection status, incident handling, or staff authority.

### Evidence At Every Handoff

Rental, return, payment, damage, maintenance, battery, and manual override flows must create traceable records with IDs, timestamps, actor, station, and photo/payment evidence where needed.

### Simple MVP, Expandable System

The launch product should focus on registration, rental, return, payment reference, staff login, incident record, basic dashboard, exports, and manual override. GPS, smart lock, real-time battery monitoring, Green Passport, carbon dashboards, AI optimization, dynamic pricing, and full tourism rewards can follow once live operations are stable.

### Bilingual, Public-Service Clarity

Station and rider experiences should work for Thai residents, domestic travelers, and foreign tourists. Critical content should be short, bilingual where appropriate, and understandable under time pressure.

For MVP, all customer-facing text should be customer-ready. Staff-only surfaces can rely on training during the MVP period, but anything shown to riders at a counter, on a tablet confirmation screen, on station signage, or inside the mobile app should be bilingual or otherwise ready for mixed Thai/tourist use.

## Primary Audiences

| Audience | Product Need | Design Risk |
| --- | --- | --- |
| Tourist rider | Register quickly, understand the rules, pay, unlock, return, and get help | Phone battery, poor connectivity, unfamiliar payment flow, language gaps |
| Local resident rider | Repeat rental with low friction and clear pricing | Account suspension, wallet/payment confusion, unclear station rules |
| Station staff | Start/return rentals, verify payments, inspect vehicles, record incidents, switch to backup mode | High queue pressure, manual entry errors, missing evidence |
| Technician | Inspect bikes, track maintenance, battery swaps, parts usage, and safety status | Unsafe bike accidentally released, incomplete repair records |
| Operations manager | Monitor availability, revenue, incidents, maintenance, and reconciliation | Bad data, unreviewed manual overrides, dashboard overload |
| Government viewer | See transparent service, financial, ESG, and audit reporting without changing records | Accidental mutation access, opaque reports, mistrust in numbers |

## MVP Scope

### Must Be Ready For Launch

- Standalone offline-first staff tablet app for station operation.
- User registration with PDPA consent and identity/contact capture.
- Frictionless staff-assisted rental for riders without the mobile app, available only at a physical station.
- Rental start record with Rental ID, Vehicle ID, station, staff/rider actor, timestamp, pre-use inspection, and payment reference.
- Return record with return station, timestamp, distance/duration where available, vehicle condition, battery level, and damage flag.
- Payment management with QR/PromptPay/manual slip reference and reconciliation state.
- Staff login and permission-sensitive manual override.
- Incident record with rental, vehicle, user, description, status, and photo evidence.
- Basic admin dashboard with fleet availability, utilization, revenue, incidents, maintenance, and exportable reports.
- Google Forms/Sheets/Drive backup workflow for start rental, return vehicle, incident report, photo evidence, manual payment records, and daily reconciliation.
- Station SOP support for opening, closing, inspection, battery handling, maintenance, and daily reports.
- Launch station configuration for Lamphun Tourism Center, Lamphun Railway Station, and storage/operations center.

### Should Be Phase 2 Or Later Unless Already Stable

- Full live GPS trip map and geofencing.
- Smart lock integration beyond the current simulated/mobile-assisted flow.
- Real-time battery telemetry and charger telemetry.
- Green Passport, merchant vouchers, hotel integration, and tourism packages.
- Predictive maintenance, demand forecasting, fleet rebalancing, dynamic pricing, and AI operations.
- Carbon credit-grade reporting; MVP can estimate carbon reduction from distance.

## MVP Launch Frame

The MVP target is end of October 2026; use October 31, 2026 as the planning target unless the project owner sets an earlier acceptance date. The MVP fleet brand is FreeDare, with the requirement extracts calling for a 100-unit e-bike fleet, 48V 500W-750W motors, Li-ion 20Ah batteries, IPX5 waterproofing, 60-120 km assisted range, and IoT/GPS locks where supported.

## Existing Product Alignment

The current mobile app already has a strong rider shell: auth, map discovery, unlock, active ride recovery, ride summary/history, wallet top-up, eco impact, profile, and support. The next design work should tighten the Lamphun-specific MVP flow around PDPA/identity, station-based rental/return, QR payment evidence, offline recovery, and bilingual station support.

The current web app already has the beginnings of an operations platform: admin auth, dashboard KPIs, bicycle management, user/wallet/ride context, ride replay, status events, and Supabase-backed data loaders. The next design work should separate operational roles more clearly and add staff/station, reconciliation, incident, maintenance, battery, and government-viewer workflows.

## Success Measures

| Category | MVP Measure |
| --- | --- |
| Service continuity | Backup mode can start, return, and reconcile rentals without stopping station service |
| Fleet availability | At least 90% of bikes available or explainable by maintenance/charging status |
| Payment integrity | Manual and digital payments link to Rental ID and can be reconciled daily |
| Safety | Returned/pending-inspection and maintenance-required bikes cannot be rented |
| Data quality | Required rental, return, payment, incident, and staff actor fields are complete |
| Transparency | Operator and government reports expose utilization, revenue, incidents, maintenance, carbon estimate, and audit history |
