# MVP Flow And Screen Inventory

## Mobile Rider App

The mobile app should stay focused on a small launch loop: register, find/scan bike, pay or link payment, ride, return, and get help.

| Screen/Flow | MVP Purpose | Design Notes |
| --- | --- | --- |
| Welcome | Explain the service and route riders into signup/login | Should emphasize public green mobility, station support, and simple rental, not a marketing-heavy splash |
| Signup/Login | Authenticate rider | Add PDPA consent, contact capture, tourist/local user type, and identity verification status when required |
| Map/Bike Discovery | Show nearby available bikes and station context | Lamphun stations and return zones should replace Bangkok-centric examples before launch |
| Bike Detail | Confirm bike status, range, price, station, and readiness | Include "cannot rent" explanations for maintenance, reserved, in use, pending inspection, or out of service |
| Scan/Unlock | Scan QR or enter bike code | The current simulated unlock should be treated as app-assisted release until physical lock integration is confirmed |
| Payment Reference | Capture or confirm QR/PromptPay/manual payment reference | Must link payment reference to Rental ID; support staff verification state |
| Active Ride | Show active rental state, elapsed time, cost estimate, help, and return guidance | Prioritize clarity and recovery over advanced map visuals |
| Return | End rental, confirm return station, condition, and payment state | Return should surface whether staff inspection is required |
| Ride Summary | Show final time, distance, cost, payment status, carbon estimate, and receipt/reference | Label estimated metrics clearly |
| History | Give rider proof of past rentals and payments | Useful for billing disputes and staff support |
| Wallet | Manage balance/top-up where supported | Keep wallet secondary to rental/payment integrity for launch |
| Support | Help with active ride, payment, accident, damaged bike, or lost item | Needs emergency and station contact path |

## Standalone Staff Tablet App

The staff station surface should be a standalone offline-first tablet app. It is the main operational tool for station staff and must remain usable without internet. The admin web app should not be the MVP station fallback because the requirements call for offline/backup operation and staff-assisted workflows.

The detailed screen-by-screen flow and sync behavior is defined in [Standalone Staff Tablet Wireflow And Offline Sync Spec](standalone-staff-tablet-wireflow.md).

| Screen/Flow | MVP Purpose | Design Notes |
| --- | --- | --- |
| Staff Login | Authenticate station staff and permissions | Cache station assignment and role for offline shift use where policy allows |
| Station Today | Queue of active rentals, returns due, bikes ready, bikes blocked, incidents, and payments to verify | This should be the staff home screen for Lamphun Tourism Center, Railway Station, and storage/operations center |
| Offline Queue | Show locally saved records waiting to sync | Every rental, return, incident, payment reference, and evidence upload needs a visible sync state |
| Start Rental | Create app-assisted or staff-assisted rental | Required fields should mirror backup form fields; allow riders without mobile app only when physically present with staff |
| Return Vehicle | Close rental and perform inspection | Must support damage, missing item, battery issue, payment issue, and pending-inspection status |
| Manual Override | Start/end rental when rider phone/app cannot complete flow | Require reason, staff actor, station, and evidence |
| Payment Verification | Match payment references/slips to Rental IDs | Provide clear pending/verified/rejected states and allow offline capture for later reconciliation |
| Incident Record | Capture accident, damage, loss, breakdown, complaint | Link to rider, rental, bike, staff, evidence, and operational state |
| Bike Inspection | Pre-use and return inspection checklist | Block unsafe bikes from ready status |
| Battery Handling | Register swap, abnormal flag, charge status, cabinet/slot | Starts with manual Battery ID/log/rotation; real-time telemetry can sync later |
| Daily Closeout | Confirm rentals, returns, cash/manual payments, incidents, and unresolved records | Should produce export/report for manager review |
| Backup Mode Launcher | Switch staff to Google Forms/Sheets procedure | Needs clear "primary system unavailable" status and checklist |

## Admin / Operations Web

The current web app already contains admin auth, dashboards, bicycle management, users, ride replay, status events, and support context. The design direction should extend that shell into operational queues rather than create separate isolated tools.

| Screen/Flow | MVP Purpose | Design Notes |
| --- | --- | --- |
| Operations Dashboard | Monitor fleet, revenue, utilization, active rides, incidents, and service pressure | Add exception queues alongside KPI cards |
| Fleet Management | Register, edit, inspect, and block bikes | Add vehicle code/QR, station assignment, battery status, maintenance state, and readiness rules |
| Bike Detail | Inspect ride history, status events, maintenance, battery, incidents, and evidence | Current status audit events are a strong foundation |
| Users | View rider profile, rentals, wallet/payment activity, support context | Add account status, PDPA/verification, blacklist/suspend |
| Payments | Reconcile payment references, manual slips, and wallet records | Payment state should be distinct from wallet transaction history |
| Incidents | Triage damage, accident, loss, complaint, breakdown | Link each incident to operational resolution |
| Maintenance | Work orders, PM/CM, technician assignment, parts, QC status | This is a launch-critical safety workflow |
| Batteries/Charging | Battery registry, charging logs, abnormal batteries, station/cabinet context | Real-time telemetry can come later; manual log design is still needed |
| Staff And Permissions | Manage station staff, technicians, managers, admins, government viewers | Use explicit role/permission labels, not a single admin flag |
| Reconciliation | Import/review backup Google records before merging | Should quarantine questionable data first |
| Reports And Exports | Daily/monthly operational, financial, maintenance, carbon, and audit exports | Separate estimated, verified, and manually corrected data |
| Government View | Read-only dashboard and export surface | No mutation controls; emphasize transparency and auditability |

## Information Architecture

Suggested top-level staff tablet navigation:

1. Station Today
2. Start Rental
3. Return Vehicle
4. Bike Check
5. Payment
6. Incident
7. Battery
8. Offline Queue
9. Daily Closeout
10. Help / SOP

Suggested top-level admin navigation:

1. Dashboard
2. Station Today
3. Rentals
4. Fleet
5. Payments
6. Incidents
7. Maintenance
8. Batteries
9. Users
10. Staff
11. Reports
12. Reconciliation
13. Settings

For MVP, Station Today, Rentals, Fleet, Payments, Incidents, Maintenance, Users, Reports, and Reconciliation are the highest-value operational surfaces.

## Design States To Specify

Every critical surface should define these states before implementation:

- Normal online mode.
- Slow network or partial sync.
- Backup mode active.
- Missing payment reference.
- Missing or rejected evidence.
- Bike unavailable.
- Bike pending inspection.
- Staff override required.
- Government read-only mode.
- Export/report pending.
