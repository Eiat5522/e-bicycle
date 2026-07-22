# Operations Domain

This repository's operations domain centers on managing bikes, bike-state transitions, and the admin surfaces that inspect or generate operational records.

## Core concepts

### Bike state history

The web API exposes bike-status history through `apps/web/src/app/api/bikes/[bikeId]/status-events/route.ts`. That route serves `bike_status_events` history reads and is restricted to authenticated admins.

The route is part of a broader pattern in the repo: operational state changes are audited explicitly rather than inferred from the latest bike row alone. The status-event history is the main source for tracing transitions over time.

### Operational reports

`apps/web/src/app/api/reports/operational/route.ts` provides the admin reporting surface for operational summaries. The route supports:

- `GET` to list persisted `operational_reports`.
- `POST` to trigger `generate_operational_report` with optional period overrides.

This keeps report generation close to the web admin workflow while delegating the actual report creation to the database RPC.

### Staff tablet planning docs

The `docs/product-design/` folder includes the current launch and delivery tracking for the standalone staff tablet track:

- `mvp-launch-decisions.md` captures the confirmed MVP direction and the source-backed bike status model.
- `open-questions.md` tracks the remaining launch decisions.
- `staff-tablet-delivery-status.md` records execution status, sequencing, and blockers.
- `staff-tablet-implementation-tickets.md` remains the backlog/specification bridge.

## Change guidance

When changing operations behavior:

1. Check the matching API route and its test file together.
2. Verify whether the change affects the admin reporting surface, the bike-status audit trail, or the product-design docs that describe the launch rules.
3. Update the generated Supabase types if the schema contract changed.

## Best starting points

- `apps/web/src/app/api/bikes/[bikeId]/status-events/route.ts`
- `apps/web/src/app/api/reports/operational/route.ts`
- `apps/web/src/lib/supabase/database.types.ts`
- `docs/product-design/staff-tablet-delivery-status.md`
- `docs/product-design/mvp-launch-decisions.md`
