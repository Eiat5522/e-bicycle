# Staff Tablet Low-Fidelity Wireframes

## Scope

These wireframes define the MVP tablet layouts for the four highest-risk station screens:

1. Station Today.
2. Start Rental.
3. Return Vehicle.
4. Offline Queue.

The purpose is to align product, design, and engineering on what staff see first, what actions are always available, and how offline states remain visible.

For implementation contracts, local tables, and sync endpoints, use [Staff Tablet Implementation Spec](staff-tablet-implementation-spec.md).

## Tablet Shell

Target orientation: landscape tablet first.

Persistent regions:

| Region | Content | Design Intent |
| --- | --- | --- |
| Top status bar | Station, staff name/role, shift time, online/offline indicator, unsynced count, backup mode flag | Staff should always know where they are operating and whether records are safe |
| Primary navigation | Station Today, Start Rental, Return Vehicle, Bike Check, Payment, Incident, Battery, Offline Queue, Daily Closeout, Help/SOP | Large touch targets; current section clearly highlighted |
| Main workspace | Task content | Optimized for fast scanning and short forms |
| Right-side context panel | Selected bike/rider/rental summary, blockers, sync status, help script | Keeps critical context visible without modal overload |
| Bottom action bar | Back/cancel, save draft, primary action, secondary escalation | Prevents hidden primary actions at the bottom of long forms |

Global touch rules:

- Primary buttons should be large enough for quick tablet use.
- Critical actions use confirmation only when the action changes rental, payment, safety, or bike status.
- Offline state must not be a small icon only; show clear words such as `Offline - saving locally`.
- Any screen with unsynced critical records should expose the Offline Queue in one tap.

## Screen 1: Station Today

### Goal

Let station staff answer: what is happening now, which bikes can be released, and what needs attention before service continues.

### Layout

| Priority | Region | Content |
| --- | --- | --- |
| 1 | Header summary | Station name, shift owner, service mode, online/offline status, unsynced count |
| 2 | Action strip | Start Rental, Return Vehicle, Scan Vehicle ID, Record Incident |
| 3 | Status cards | Active rentals, returns due, ready bikes, blocked bikes, pending payments, open incidents |
| 4 | Work queues | Active rentals list, returns due/overdue list, blocked bike list |
| 5 | Context panel | Backup checklist, recent sync event, manager contact/SOP quick link |

### Status Cards

| Card | Shows | Tap Behavior |
| --- | --- | --- |
| Active rentals | Count and oldest active rental | Opens active rental queue |
| Returns due | Count, overdue count, next due item | Opens return workflow filtered to due rentals |
| Ready bikes | Count by station | Opens bike availability list |
| Blocked bikes | Count by pending inspection, charging, maintenance, out of service | Opens Bike Check |
| Pending payments | Count and oldest pending reference | Opens Payment |
| Open incidents | Count by severity/type | Opens Incident queue |

### Primary States

| State | Screen Behavior |
| --- | --- |
| Online normal | Status bar says online, latest sync time visible, action strip fully enabled |
| Offline normal | Status bar says offline, unsynced count emphasized, all local-safe actions remain enabled |
| Backup mode active | Backup checklist appears above queues; Start Rental and Return Vehicle still save locally |
| Shift closeout needed | Daily Closeout card appears in action strip after configured time |
| No station selected | Lock workspace and prompt staff to select/confirm station |

### Empty States

- No active rentals: show ready bike count and Start Rental action.
- No ready bikes: show blocked-bike breakdown and Bike Check action.
- No pending work: show Daily Closeout readiness if near shift end.

## Screen 2: Start Rental

### Goal

Create a valid Rental ID before releasing a bike, even when offline.

### Layout

| Step | Main Workspace | Context Panel |
| --- | --- | --- |
| 1. Rider | Search phone/name, create station-assisted rider, PDPA/rental notice confirmation | Rider summary, consent state, station-assisted label |
| 2. Vehicle | Scan/enter Vehicle ID, show bike status, station, battery, last check | Rentable/blocker decision and reason |
| 3. Inspection | Fast pre-use checklist | Failed items and required action |
| 4. Payment | Payment method, amount/plan, reference/slip capture, pending allowed if policy permits | Payment verification state |
| 5. Review | Rental ID preview, rider, bike, station, payment, inspection, sync behavior | Release checklist and primary confirmation |

### Stepper Behavior

| Step | Required To Continue |
| --- | --- |
| Rider | Name, phone, user type, required consent/notice acceptance |
| Vehicle | Vehicle ID found or manually accepted as station exception; bike must be rentable |
| Inspection | All critical checks pass |
| Payment | Payment reference or explicit pending/exception state |
| Review | Staff confirms Rental ID is created before release |

### Pre-Use Checklist Controls

Use large pass/fail controls:

- Brakes.
- Tires.
- Lights.
- Frame/handlebar/seat.
- Battery level/status.
- QR/Vehicle ID readable.
- No visible damage.
- No open maintenance/incident hold.

Failed critical item behavior:

- The primary action changes from `Continue` to `Block Bike`.
- Staff can create maintenance/incident from the same screen.
- The bike cannot move to rental review while a critical item fails.

### Offline Behavior

| Offline Moment | Behavior |
| --- | --- |
| Before rider lookup | Search local cached riders first; allow new station-assisted rider |
| Before vehicle lookup | Search local station bike cache; allow manager/staff exception only if policy permits |
| Before payment verification | Save reference as pending verification |
| On final create | Generate local Rental ID and mark record `Ready to sync` |

### Success Confirmation

Show a rider-facing summary with:

- Rental ID.
- Vehicle ID.
- Start station.
- Start time.
- Payment state.
- Return instructions.
- Help/emergency contact.
- Sync state: `Synced` or `Saved locally - station staff will reconcile`.

## Screen 3: Return Vehicle

### Goal

Close a rental or safely hold the bike after return.

### Layout

| Step | Main Workspace | Context Panel |
| --- | --- | --- |
| 1. Find rental | Search Rental ID, Vehicle ID, rider phone, scan bike QR | Active rental summary or exception warning |
| 2. Return details | Return station, timestamp, distance/usage if available, battery level | Expected rental and payment state |
| 3. Inspection | Return checklist, damage flag, photo evidence | Bike status outcome preview |
| 4. Payment | Confirm paid, pending, mismatch, or dispute | Reconciliation note |
| 5. Finish | Final bike status, incident/work order decision, sync state | Rider-facing closeout message |

### Return Inspection Checklist

- Brakes.
- Tires.
- Lights.
- Frame/handlebar/seat.
- Battery normal.
- No new visible damage.
- Accessories present.
- Vehicle ID/QR readable.
- Rider dispute or complaint.

### Bike Outcome Rules

| Inspection / Payment Result | Bike Outcome | Record Outcome |
| --- | --- | --- |
| Pass and payment ok | Ready to rent | Completed |
| Pass and payment pending | Ready to rent or pending by policy | Completed, payment pending |
| Any critical inspection fail | Maintenance required | Incident or work order created |
| Damage / accident / lost item | Out of service or maintenance required | Incident opened |
| Return without matching start | Returned / pending inspection | Exception record |
| Offline return | Locally blocked until sync confirms | Ready to sync |

### Offline Behavior

- If the matching rental exists locally, attach return directly.
- If the matching rental exists only on the server and the app is offline, create a backup return exception with Vehicle ID, rider phone, station, and evidence.
- The tablet must locally block the returned bike from new rental until sync or manager resolution.

### Rider-Facing Closeout

Show short confirmation:

- Rental ID.
- Return accepted or pending review.
- Payment state.
- Bike inspection state.
- Next step if payment/incident is pending.

## Screen 4: Offline Queue

### Goal

Make unsynced operational work visible, retryable, exportable, and safe.

### Layout

| Region | Content |
| --- | --- |
| Header | Online/offline state, last successful sync, next retry, total unsynced critical records |
| Filter tabs | All, Rentals, Returns, Payments, Incidents, Bike Checks, Battery, Evidence, Conflicts |
| Queue list | Record type, business ID, station, staff, time, sync state, blocking issue |
| Detail panel | Selected record payload summary, evidence status, retry history, conflict reason |
| Action bar | Retry sync, edit allowed fields, attach evidence, export to backup, escalate to manager |

### Sync State Labels

| Label | Staff Meaning |
| --- | --- |
| Draft | Incomplete; finish before sync |
| Ready to sync | Complete and waiting for internet |
| Syncing | Uploading now |
| Synced | Accepted by backend |
| Needs evidence upload | Record accepted but photo/slip still pending |
| Conflict | Needs correction or manager reconciliation |
| Exported to backup | Entered/exported to Google Workflow but not accepted by backend |
| Rejected | Kept for audit; no longer actionable by staff |

### Queue Item Priority

Sort by operational risk:

1. Conflicts that affect bike availability.
2. Rental starts.
3. Returns.
4. Payment references.
5. Incidents.
6. Bike checks and battery logs.
7. Evidence uploads.
8. Closeout summaries.

### Conflict Detail Panel

Each conflict should show:

- What staff recorded.
- What the server or manager record says.
- Why it matters.
- Allowed staff correction.
- When to escalate.

Examples:

| Conflict | Staff Copy |
| --- | --- |
| Bike already in use | This bike was rented elsewhere before this tablet synced. Do not release it again. Escalate to manager. |
| Missing evidence | Photo/slip is required before this record can be completed. Attach evidence or mark backup evidence reference. |
| Return without start | This return does not match an active rental in the system. Keep bike blocked and escalate. |
| Payment mismatch | Payment reference or amount does not match expected rental payment. Keep payment pending. |

### Backup Export

Export action should include:

- Start Rental records.
- Return Vehicle records.
- Incident records.
- Payment evidence references.
- Evidence file list.
- Daily closeout summary.

After export, records move to `Exported to backup`, not `Synced`.

## Cross-Screen Components

### Vehicle Status Chip

Statuses:

- Ready to rent.
- Reserved.
- In use.
- Returned / pending inspection.
- Charging.
- Maintenance required.
- Out of service.

The chip should include a short reason and next allowed action.

### Sync Badge

States:

- Online.
- Offline - saving locally.
- Syncing.
- Unsynced records.
- Conflict.
- Backup mode.

Use text plus color/icon; never rely on color alone.

### Evidence Capture

Evidence capture appears in:

- Pre-use inspection.
- Return inspection.
- Payment slip.
- Incident.
- Bike check.
- Battery abnormal log.

Each evidence item needs:

- Capture source.
- Linked parent record.
- Local file state.
- Upload state.
- Retry action.

## MVP Prototype Order

Build low-fidelity clickable flows in this order:

1. Station Today to Start Rental to saved offline success.
2. Station Today to Return Vehicle to maintenance-required outcome.
3. Offline Queue with one ready-to-sync rental, one evidence-pending return, and one conflict.
4. Daily Closeout entry point from Station Today with unsynced warning.

## Copy Notes

Customer-facing labels should be bilingual in final UI. For low-fidelity wireframes, English placeholders are acceptable as long as the content structure accounts for Thai and English text lengths.

Staff-only labels can remain simple for MVP because staff can be trained, but incident, damage, payment, and return explanations shown to riders must be ready for public use.
