# Open Questions

These are the remaining product/design decisions that should be answered before high-fidelity mockups or implementation planning.

## Answered For MVP

| Topic | Decision |
| --- | --- |
| Staff station surface | Standalone offline-first tablet app, not just responsive admin web. |
| Launch stations | Lamphun Tourism Center, Lamphun Railway Station, and storage/operations center. |
| MVP deadline | End of October 2026; use October 31, 2026 as the planning target unless the project owner sets an earlier acceptance date. |
| Customer-facing language | All customer-facing parts should be ready for mixed Thai/tourist use; staff can be trained for MVP. |
| PDPA direction | Frictionless and minimal: collect only necessary rental/safety/payment/support data, show short notice plus timestamped consent, keep optional marketing/tourism consent separate. |
| No-mobile-app rental | Allowed only at a physical station with staff assistance through the tablet app. |
| Bike brand | FreeDare for MVP. |
| Bike status / inspection policy | Use the source-backed status and inspection model in `mvp-launch-decisions.md`. |

## Launch Model

1. What is the exact end-of-October acceptance checklist and demo script?
2. What devices and operating systems will the standalone staff tablet app run on?
3. How long must the tablet app operate offline before a mandatory sync/export?
4. Which customer-facing surfaces require full Thai/English copy on day one: mobile app, tablet confirmation, signage, receipt, support scripts, or all of these?

## Rider And Registration

1. What identity fields are legally required for Thai residents and tourists?
2. Is passport/ID document upload required, staff-verified only, or metadata-only for MVP?
3. What exact PDPA consent language, data controller contact, retention policy, and consent withdrawal path should appear?
4. What account states are required: active, suspended, blacklisted, pending verification, deleted?

## Payment

1. Which payment methods are actually launch-approved: PromptPay QR, wallet, TrueMoney, Rabbit LINE Pay, credit card, cash, voucher, or manual slip only?
2. Does payment happen before rental start, after return, or both depending on user type?
3. Who verifies manual payment slips, and what evidence is required?
4. Is a receipt required in-app, printed, exported, or all three?
5. What are the launch prices, deposit rules, overtime rules, and refund rules?

## Vehicle And Station Operations

1. What Vehicle ID and QR code format will be printed on bikes?
2. What exact battery threshold blocks rental?
3. Is missing GPS/IoT signal a rental blocker for MVP, or only an operational warning?
4. Are returns allowed at all launch stations, only the origin station, or staff-approved storage/operations center handoff?
5. What exact pre-use and return inspection checklist labels should appear on the tablet?

## Backup Mode

1. Who can activate backup mode?
2. Is backup mode station-specific or system-wide?
3. What Manual Rental ID format should be official?
4. Are Google Forms already created, or should product/design define their field structure?
5. How quickly must backup records be reconciled: same day, next morning, or before monthly reporting?

## Roles And Permissions

1. Confirm the role matrix: public user, registered user, station staff, technician, operations manager, admin, government viewer.
2. What can each role create, edit, approve, export, and delete?
3. Should government viewer use a separate read-only dashboard or a read-only mode inside the same admin app?
4. Which actions require two-person approval: override, payment correction, incident closure, bike out-of-service removal, or report publication?

## Maintenance And Battery

1. What are the exact preventive maintenance intervals: daily, every 7 days cleaning, distance-based checks, monthly inspection?
2. What is the repair SLA and escalation rule when a bike exceeds it?
3. What battery data is manual on day one versus IoT-fed later?
4. What battery temperature, SOH, or charge thresholds block use?
5. What parts inventory fields are needed for launch?

## Tourism And ESG

1. Is Green Passport in launch scope or a later phase?
2. Which tourism partners, hotels, cafes, routes, and vouchers are confirmed?
3. What carbon calculation formula should be used for MVP estimates?
4. Which reports are required by Lamphun PAO monthly?
5. How should estimated, manually corrected, and verified ESG metrics be labeled?

## Visual And Brand Direction

1. Is there an official Lamphun Smart Green Mobility brand kit: logo, colors, type, icon style, imagery, bilingual naming?
2. Should the rider app keep the current Glide visual style or move toward Lamphun civic/tourism branding?
3. Are station signs and app screens expected to share the same visual language?
4. What tone should the product use: civic service, tourism guide, premium mobility, or operational utility?

## Recommended Next Design Step

Answer these five next:

1. Launch payment methods and pricing/deposit rules.
2. Exact PDPA copy, retention period, data controller details, and withdrawal path for the short and full notices.
3. Staff tablet offline duration, device target, and sync/export behavior.
4. Exact pre-use and return inspection checklist.
5. Battery threshold and GPS/IoT blocker policy for FreeDare MVP bikes.
