# Staff Tablet Delivery Status

## Purpose

This document is the single product-design status view for the staff tablet delivery track. The detailed scope and acceptance criteria remain in [Staff Tablet Implementation Tickets](staff-tablet-implementation-tickets.md); this document records only execution status, sequencing, and blockers.

## Status Baseline

- Baseline date: July 18, 2026.
- MVP planning target: October 31, 2026.
- Current stage: documented and ready for launch-policy decisions; implementation has not started.
- Repository evidence at baseline: no `apps/staff-tablet` workspace, shared tablet contracts, `/api/staff-tablet/*` routes, tablet sync tables, or admin tablet-conflict review surface were found.
- Next implementation ticket: `ST-CONTRACT-01`; assign and time-box the launch-blocking decisions below in parallel.

## Status Definitions

| Status      | Meaning                                                                             |
| ----------- | ----------------------------------------------------------------------------------- |
| Not started | No implementation work is present in the repository.                                |
| Ready       | Dependencies and required product decisions are resolved; work can begin.           |
| In progress | Implementation is actively underway.                                                |
| Blocked     | Work cannot continue until the named dependency or decision is resolved.            |
| In review   | Acceptance criteria are implemented and validation/review is underway.              |
| Complete    | Acceptance criteria pass and the implementation is merged into the delivery branch. |

## Launch-Blocking Decisions

These decisions should be resolved before their affected workflows are finalized. They do not need to prevent foundational shared-contract and additive schema work from starting if unresolved values remain configuration-driven.

Customer responses are tracked in the [Staff Tablet Launch Decision Questionnaire](staff-tablet-launch-decision-questionnaire.xlsx). The workbook breaks the launch decisions into 83 individual questions across dedicated worksheets for:

1. Payment and pricing.
2. PDPA and rider identity.
3. Tablet devices and offline operation.
4. Vehicle identification and inspection.
5. Battery readiness and GPS/IoT policy.
6. Roles and approvals.
7. Backup mode and reconciliation.
8. MVP acceptance and station demonstration.

Use the workbook's `Instructions & Summary` sheet to monitor customer-response completion. Update the related milestone or ticket blockers in this document after responses are approved.

## Delivery Milestones

| Order | Milestone                                  | Included tickets                                                                       | Status      |
| ----- | ------------------------------------------ | -------------------------------------------------------------------------------------- | ----------- |
| 0     | Lock launch policies and acceptance script | Product/operations decisions above                                                     | Not started |
| 1     | Shared contracts and server foundation     | `ST-CONTRACT-01` to `ST-CONTRACT-02`, `ST-API-01` to `ST-API-02`                       | Not started |
| 2     | Bootstrap and idempotent sync proof        | `ST-API-03` to `ST-API-04`                                                             | Not started |
| 3     | Tablet shell and local data foundation     | `ST-APP-01` to `ST-APP-05`                                                             | Not started |
| 4     | Offline rental and return vertical slice   | `ST-API-05` to `ST-API-06`, `ST-APP-06` to `ST-APP-07`, `ST-APP-11`                    | Not started |
| 5     | Evidence and launch safety workflows       | `ST-API-07` to `ST-API-08`, `ST-APP-08` to `ST-APP-10`, `ST-APP-12`                    | Not started |
| 6     | Reconciliation, closeout, and backup       | `ST-API-09` to `ST-API-11`, `ST-APP-13` to `ST-APP-15`, `ST-ADMIN-01` to `ST-ADMIN-02` | Not started |
| 7     | Operational beta and launch acceptance     | Cross-cutting scenarios, station drills, training, SOPs, and sign-off                  | Not started |

## Ticket Status

| Epic                          | Tickets                              | Status      | Current blocker or next action                                             |
| ----------------------------- | ------------------------------------ | ----------- | -------------------------------------------------------------------------- |
| Shared contracts              | `ST-CONTRACT-01` to `ST-CONTRACT-02` | Not started | Begin with shared tablet domain types and status mapping.                  |
| Backend schema and sync       | `ST-API-01` to `ST-API-11`           | Not started | Start additive sync tables after shared contract names are fixed.          |
| Tablet foundation             | `ST-APP-01` to `ST-APP-05`           | Not started | Depends on shared contracts; device policy affects authentication details. |
| Tablet MVP workflows          | `ST-APP-06` to `ST-APP-10`           | Not started | Payment, inspection, battery, and evidence policies remain open.           |
| Sync, conflicts, and closeout | `ST-APP-11` to `ST-APP-15`           | Not started | Depends on sync API and local repository foundation.                       |
| Admin reconciliation          | `ST-ADMIN-01` to `ST-ADMIN-02`       | Not started | Depends on tablet conflict API.                                            |

## MVP Release Gates

### Station-Assisted Rental Gate

All tickets listed under the MVP release gate in [Staff Tablet Implementation Tickets](staff-tablet-implementation-tickets.md) must be complete, and the following scenarios must pass:

1. Offline rental start synchronizes exactly once.
2. Offline return with failed inspection blocks the bike.
3. Duplicate Rental ID and stale bike state produce visible conflicts without overwriting canonical state.
4. Required evidence remains actionable until uploaded and linked.
5. Unauthorized staff, station, and device operations are rejected.

### Operational Beta Gate

1. Managers can resolve conflicts and tablets receive the resolution.
2. Backup export remains distinct from canonical sync.
3. Daily closeout exposes unresolved critical work.
4. The approved Google Workflow fallback has been exercised during an outage drill.
5. All three launch locations complete the station demo script.

## Update Rules

Update this document in the same change that alters delivery status:

1. Change a ticket group or milestone to `In progress` when its first ticket begins.
2. Record a named blocker rather than leaving work indefinitely `In progress`.
3. Mark work `Complete` only after its ticket acceptance criteria and validation commands pass.
4. Update the baseline summary when repository evidence changes materially.
5. Refresh the timeline/status language in [Lamphun Smart Green Mobility Gamma Deck](lamphun-smart-green-mobility-gamma-deck.md) before presenting it to stakeholders.
