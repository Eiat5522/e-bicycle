# MVP Launch Decisions

## Confirmed Direction

| Decision | MVP Direction |
| --- | --- |
| Staff station surface | Build a standalone offline-first tablet app. The station app must continue core rental/return/incident work without internet and sync later. |
| Launch stations | Lamphun Tourism Center, Lamphun Railway Station, and storage/operations center. |
| MVP deadline | End of October 2026; use October 31, 2026 as the planning target unless the project owner sets an earlier acceptance date. |
| Customer-facing language | All customer-facing parts should be bilingual or otherwise customer-ready. Staff-facing tools can be English/Thai-light for MVP because staff can be trained during the MVP period. |
| No-mobile-app rental | Allowed only in person at a station with staff assistance through the tablet app. |
| Bike brand | FreeDare for the MVP phase. |

## Product Implications

### Standalone Staff Tablet App

The staff tablet app is a launch-critical product, not a secondary admin view. It must support:

- Local station login/session handoff for trained staff.
- Offline rental start, return, incident, payment-reference capture, inspection checklist, and evidence queue.
- On-device draft records with sync states: saved locally, pending upload, synced, conflict, rejected.
- Clear station context: Lamphun Tourism Center, Railway Station, or storage/operations center.
- Manual staff-assisted customer registration for riders without the mobile app.
- Backup export or Google Workflow fallback when the primary sync path is unavailable.

The admin web app should remain the manager/governance surface for dashboards, reconciliation, reports, user/fleet management, and government read-only visibility.

### Customer-Facing Language

For MVP, customer-facing text includes:

- Mobile rider app.
- Station signage and QR instructions.
- Staff-assisted rental confirmation shown to the rider.
- Payment instructions and receipt/reference screens.
- Return/inspection explanations.
- Incident/help/emergency scripts.

Staff-only configuration, internal queue labels, and manager reports can be trained for MVP, but any text visible to riders at the counter should be customer-ready.

## PDPA Design Note

This is a product design note, not legal advice. The MVP registration should be frictionless and minimal while still capturing the consent and notice required for a public rental service.

Current PDPA guidance supports these design rules:

- Collect only the personal data necessary for the lawful rental, safety, payment, support, and audit purpose.
- Tell the rider the purpose before or at collection.
- Keep consent explicit through a written/electronic confirmation when consent is the basis.
- Do not bundle optional marketing, personalization, tourism rewards, or future analytics into the required rental consent.
- Make consent withdrawal and privacy contact access visible without blocking the main rental path.

Source notes:

- Thailand PDPA Section 19 requires consent before or at collection/use/disclosure unless another legal basis applies, and consent can be written or electronic.
- Section 21 requires use according to the purpose notified to the data subject.
- Section 22 limits collection to what is necessary for the lawful purpose.
- Section 23 requires notice before or at collection.
- Current Thai PDPA summaries also emphasize that withdrawal should be as easy as giving consent.

MVP registration should therefore use a two-layer pattern:

1. Short consent and rental notice on the form: name, phone, email or contact method, local/tourist type, ID/passport reference where required, payment/rental records, incident/support evidence, and retention/support purpose.
2. Full privacy notice link or station QR for detailed PDPA text, rights, controller contact, retention, disclosure, and withdrawal path.

Recommended MVP fields:

| Field | MVP Treatment |
| --- | --- |
| Name | Required for rental record and support. |
| Phone | Required for contact, recovery, incident, and staff-assisted rental. |
| Email | Optional unless needed for account login or receipt. |
| User type | Required: citizen/local or tourist. |
| ID/passport reference | Staff-verified or minimal reference for tourist support if policy requires it; avoid uploading document images unless required. |
| PDPA consent/agreement | Required timestamped acceptance. |
| Marketing/tourism rewards | Separate optional consent later, not part of core rental. |

## Source-Backed Bike Status Model

The requirements use three overlapping status sets:

- MVP table: Ready, Repair, In-use.
- Functional specification: Available, Reserved, Rented, Charging, Maintenance, Out of Service.
- Database requirements: Status (Ready/In Use/Repair), battery status, device status, rental status, station operating status, and maintenance quality-check status.

Use this product status model for MVP:

| Product Status | Meaning | Rentable? |
| --- | --- | --- |
| Ready to rent | Bike passed inspection, battery is acceptable, no open incident/repair hold. | Yes |
| Reserved | Bike is temporarily held for a rider or staff process. | No |
| In use | Active rental exists. | No |
| Returned / pending inspection | Rider returned the bike, but staff inspection has not cleared it. | No |
| Charging | Bike or battery is not ready because charging/rotation is in progress. | No |
| Maintenance required | Bike failed inspection, has repair work, or has a safety issue. | No |
| Out of service | Bike is unavailable for operational, safety, loss, or administrative reasons. | No |

Implementation can map these to existing database enums in the short term, but the user-facing/staff-facing design should not blur safety states into a generic unavailable label.

## Return And Inspection Policy

The requirements support this MVP policy:

1. Staff must not release a bike without a Rental ID.
2. Staff must not release a bike without a pre-use check.
3. Check-out records must capture Rental ID, pre-use inspection, remaining battery, and photo evidence where needed.
4. Check-in records must capture return inspection, distance/usage where available, battery level, and damage report.
5. A returned bike becomes `Returned / pending inspection` until staff clears it.
6. If damage, abnormal battery, brake/tire/light issue, missing part, accident, or complaint is found, the bike becomes `Maintenance required` or `Out of service` and should create an incident or maintenance work order.
7. Daily safety checks cover brakes, tires, and lights.
8. Cleaning happens every 7 days.
9. Repair completion target is within 5 days.
10. Fleet availability target is 90%.
11. Abnormal batteries must be separated from service; battery work starts with Battery ID, Battery Log, charging schedule, timer control, and manual battery rotation.

## MVP Station Scope

| Station | Role |
| --- | --- |
| Lamphun Tourism Center | Main mobility hub, visitor service, rental/return, operations command, battery/storage/maintenance coordination. |
| Lamphun Railway Station | Multimodal entry point and rental/return surface for rail-adjacent riders. |
| Storage/operations center | Fleet preparation, storage, maintenance, inspection, cleaning, battery handling, and daily operations control. |
