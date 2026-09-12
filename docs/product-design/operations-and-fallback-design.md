# Operations And Fallback Design

## Why Fallback Is Part Of The Product

The source requirements are explicit: the app is important, but continuity of public service is more important. The system must continue when the app, internet, payment gateway, or primary database is unavailable.

The fallback design is not an emergency afterthought. The MVP station tool is a standalone offline-first staff tablet app, backed by Google Workflow when primary sync is unavailable. Both paths use the same core entities:

- Rental ID
- Vehicle ID
- User/rider identity
- Station
- Staff actor
- Start/return timestamp
- Payment reference
- Inspection result
- Incident state
- Evidence files

## Backup Mode Components

| Component | Product Role |
| --- | --- |
| Staff tablet local queue | First-line offline capture for rentals, returns, incidents, payment references, inspections, and evidence |
| Google Form: Start Rental | Manual API endpoint for starting a rental |
| Google Form: Return Vehicle | Manual API endpoint for ending a rental and recording inspection |
| Google Form: Incident Report | Manual API endpoint for accident, damage, loss, breakdown, or complaint |
| Google Sheet: Master Rental Log | Temporary ledger while primary system is unavailable |
| Google Drive: Photo Evidence | Temporary evidence storage for bike condition, damage, ID, or payment slip |
| QR Payment Manual Record | Payment reference capture when gateway automation fails |
| Daily Reconciliation | Controlled merge from temporary ledger into primary system |

## Backup Mode UX Requirements

### Activation

- Only station manager, operations manager, or admin can declare backup mode.
- The UI should show who activated it, when, why, and which station is affected.
- Staff should see a checklist: use backup forms, keep evidence photos, issue manual Rental IDs, and perform daily closeout.
- If the staff tablet app is available but offline, staff should save records locally first and use Google Forms/Sheets as the procedural backup/export path when sync or the primary system remains unavailable.

### Manual Rental ID Format

Use a strict, human-readable format that avoids primary key collisions:

```text
YYYYMMDD-STATIONCODE-SEQUENCE
```

Example:

```text
20260715-LPNRAIL-001
```

The primary database should still use internal IDs. Manual Rental ID should be an indexed business reference for reconciliation, audit, and staff communication.

### Field Parity

The backup forms should mirror the primary system fields as closely as possible. Do not rely on free-text fields when a dropdown, scanned code, photo upload, or constrained format can reduce errors.

Start Rental minimum fields:

- Manual Rental ID
- Station
- Staff actor
- Rider name/contact/user ID if known
- Vehicle ID
- Start timestamp
- Payment method/reference
- Pre-use condition
- Photo evidence

Return Vehicle minimum fields:

- Manual Rental ID
- Station
- Staff actor
- Vehicle ID
- Return timestamp
- Battery/condition result
- Damage or incident flag
- Payment confirmation
- Photo evidence

Incident minimum fields:

- Incident ID or linked Manual Rental ID
- Vehicle ID
- Rider/user if known
- Station
- Incident type
- Description
- Photo evidence
- Staff actor
- Resolution owner/status

## Reconciliation Experience

Reconciliation should use a quarantine-first model:

1. Import Google Sheet rows and Drive evidence references.
2. Validate required fields and ID formats.
3. Detect conflicts and impossible states.
4. Show grouped review queues by station and date.
5. Let a manager approve, correct, reject, or assign records.
6. Merge approved records into rental, payment, incident, maintenance, audit, and report tables.

## Conflict Types

| Conflict | Design Response |
| --- | --- |
| Duplicate Manual Rental ID | Block merge until one record is corrected or rejected |
| Vehicle already in use | Require manager decision and audit note |
| Return without start | Create exception and assign to station manager |
| Start without return | Keep rental open/pending and surface in closeout |
| Payment slip missing | Mark payment pending verification |
| Payment amount mismatch | Route to payment reconciliation queue |
| Damage noted without incident | Prompt staff/manager to create incident |
| Bike marked ready after failed inspection | Block ready status and create maintenance task |
| Missing staff actor | Require manager correction before merge |

## Manual Override Design

Manual override is required because riders may have no data, dead phones, no local SIM, or app failure. It must be safe and auditable.

Override design rules:

- Use role-based access. Public riders cannot trigger staff override.
- Require reason: phone unavailable, connectivity issue, payment issue, station exception, system outage, emergency, or manager instruction.
- Capture staff actor, station, device, timestamp, before/after bike status, and linked Rental ID.
- Show a visible warning when override changes financial or vehicle state.
- Include override records in audit logs and reconciliation reports.

## Status Model For Operations

The launch UI should distinguish these bike states:

- Ready to rent
- Reserved
- In use
- Returned / pending inspection
- Charging
- Maintenance required
- Out of service
- Lost / incident hold

If the underlying app still uses a narrower status enum, the design should still show the operational intent and map it carefully to implementation constraints.

## Return And Inspection Policy

The MVP station workflow should enforce the policy from the requirements:

- Never release a bike without a Rental ID.
- Never release a bike without pre-use inspection.
- Check-out captures Rental ID, Vehicle ID, pre-use condition, remaining battery, staff/rider actor, and photo evidence where needed.
- Check-in captures return inspection, distance/usage where available, returned battery level, and damage/incident status.
- Returned bikes move to `Returned / pending inspection` until staff clears them.
- Failed inspection, abnormal battery, damage, breakdown, loss, accident, or complaint moves the bike to `Maintenance required` or `Out of service`.
- Daily safety checks cover brakes, tires, and lights.
- Cleaning is required every 7 days.
- Repair completion target is within 5 days.
- Fleet availability target is 90%.

## Reporting Outputs

Daily operations should produce:

- Total rentals and returns.
- Active/unreturned rentals.
- Fleet availability and blocked bikes.
- Revenue and payment reconciliation.
- Incidents and damage.
- Maintenance created/completed.
- Battery swaps/charging exceptions.
- Backup mode activations and manual overrides.
- Data completeness exceptions.

Monthly/government reports should add:

- Utilization by station.
- Availability rate.
- Repair time and PM compliance.
- Revenue totals and exceptions.
- Customer satisfaction/complaints where available.
- Estimated distance and carbon reduction.
- Audit summary and manual override count.
