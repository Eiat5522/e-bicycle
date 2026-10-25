# Personas And Journeys

## Personas

### Tourist Rider

The tourist is in Lamphun for a short visit, may not speak Thai fluently, and may have limited mobile data or battery. They want a clear route, simple registration, transparent pricing, a familiar payment option, and confidence that staff can help if the phone fails.

Design needs:

- Fast onboarding with passport/phone support.
- Clear PDPA and rental terms in short language.
- Station signage and in-app instructions that match each other.
- QR payment status and visible receipt/reference.
- Return guidance that explains where to park and what staff will inspect.
- Emergency and help access without hunting through menus.

### Local Resident Rider

The resident may reuse the service for short trips. They care about speed, account reliability, pricing, wallet balance, and not being blocked by previous unresolved rentals.

Design needs:

- Low-friction repeat rental.
- Clear account status, wallet balance, and history.
- Pricing, overtime, and return rules surfaced before unlock.
- Support path for billing disputes or incorrect ride state.

### Station Staff

Station staff handle queues, vehicle handoff, inspection, payment verification, and fallback operations. They need clarity more than visual polish.

Design needs:

- Start rental by scanning or entering Vehicle ID and rider identity.
- Return rental with inspection checklist and damage/payment evidence.
- Offline-first tablet workflow that keeps working without internet.
- Manual override with reason capture and role confirmation.
- Backup mode that mirrors the core system fields.
- Daily closeout: unresolved rentals, unmatched payments, incidents, and reconciliation queue.

### Technician

The technician keeps bikes, batteries, chargers, and parts safe. They need work orders, checklists, status locks, and a way to prevent unsafe bikes from returning to service.

Design needs:

- Bike status change to maintenance/out of service.
- Preventive and corrective maintenance logs.
- Battery ID, charge status, abnormal flag, and swap logs.
- Parts inventory consumption.
- Quality check before returning bike to ready status.

### Operations Manager

The manager monitors daily service health and solves exceptions. They need live metrics, filtered queues, exports, and confidence that manual entries are being reconciled.

Design needs:

- Fleet status, station status, utilization, revenue, maintenance, incidents, and payment reconciliation.
- Exception queues for pending inspection, missing payment evidence, unresolved incident, and backup-mode import.
- Role-aware staff activity and audit trail.
- Report exports for daily/monthly operations.

### Government Viewer

The government viewer needs transparent read-only visibility into public assets, revenue summaries, service performance, carbon estimates, incidents, and SLA/KPI progress.

Design needs:

- Read-only dashboards and report exports.
- Clear labels for estimated vs verified metrics.
- No mutation controls.
- Audit visibility without operational clutter.

## Core Journeys

### 1. App-Assisted Rider Rental

1. Rider opens the app or scans a station QR.
2. Rider signs up or signs in.
3. Rider confirms PDPA consent, identity/contact information, and rental terms.
4. Rider selects or scans the bike QR code.
5. App checks bike status: ready, battery acceptable, not in maintenance, not already rented.
6. Rider confirms pricing and payment method/reference.
7. System creates Rental ID and marks bike in use.
8. Rider sees active ride status, help, and return guidance.

Key design requirement: the rider should always know whether the bike is actually released, payment is pending, or staff assistance is required.

### 2. Staff-Assisted Rental

1. Staff searches or creates the rider profile.
2. Staff scans/enters Vehicle ID and verifies bike readiness.
3. Staff performs pre-use inspection and optionally captures photo evidence.
4. Staff records payment reference or manual slip.
5. Staff starts the rental with a staff actor and station.
6. Rider receives or is shown Rental ID and return instructions.

Key design requirement: staff-assisted rentals are allowed for riders without the mobile app only when the rider is physically present at a station. They must not look like a shortcut around governance. They need actor, reason, station, timestamp, and evidence.

### 3. Return And Inspection

1. Rider returns to a station or designated return zone.
2. App or staff identifies active Rental ID.
3. Staff or app records return station, time, mileage/distance where available, and battery level.
4. Staff completes inspection: ok, damage, missing item, battery issue, or incident.
5. System finalizes charges/payment state.
6. Bike moves to ready only if inspection passes; otherwise pending inspection, maintenance required, or out of service.

Key design requirement: the return flow is a safety gate, not just a checkout confirmation screen.

### 4. Backup Mode Rental

1. Station manager declares backup operations.
2. Staff uses Google Form: Start Rental.
3. Form captures manual Rental ID, rider, Vehicle ID, station, time, payment reference, and pre-use evidence.
4. Staff uses Google Drive for photo/payment evidence.
5. Google Sheet becomes the temporary ledger.
6. When the primary system returns, the records enter reconciliation before merging into the canonical ledger.

Key design requirement: backup mode should feel procedural and calm, with visible field parity to the primary system.

### 5. Daily Reconciliation

1. Manager opens reconciliation queue.
2. System groups imported backup records by date, station, manual Rental ID, payment reference, and evidence folder.
3. Manager reviews conflicts: duplicate Vehicle ID, missing return, mismatched payment, impossible timestamp, damaged bike without incident, or missing staff actor.
4. Valid records merge into rental, payment, incident, maintenance, and audit records.
5. Exceptions remain assigned with status and owner.

Key design requirement: reconciliation should protect the primary ledger from bad manual data while still letting operations continue.

### 6. Incident And Maintenance Escalation

1. Staff or rider reports accident, damage, loss, complaint, breakdown, or battery issue.
2. Incident links to Rental ID, Vehicle ID, user, station, evidence, and staff actor.
3. Bike status changes to pending inspection or maintenance required.
4. Technician creates or updates work order.
5. Manager sees incident and fleet availability impact.
6. Bike returns to ready only after repair and quality check.

Key design requirement: incident reporting should create operational state changes, not just a note.
