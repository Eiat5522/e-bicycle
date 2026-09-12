# Testing Guidance

The current source changes point to two kinds of tests that matter most in this repository: API route tests in `apps/web` and contract tests around Supabase-backed behavior.

## What to test first

### Web API routes

Recent source updates include:

- `apps/web/src/app/api/bikes/[bikeId]/status-events/route.ts`
- `apps/web/src/app/api/reports/operational/route.ts`
- `supabase/migrations/20260714000000_atomic_bike_status_update.sql`
- `supabase/migrations/20260714170000_make_bike_status_rpc_params_nullable.sql`
- `apps/web/src/lib/supabase/schema-contract.test.ts`

When these routes change, validate:

- authentication and admin gating,
- 400/401/403/500 error handling,
- Supabase query shape and sorting,
- JSON response shape expected by the consuming UI.

### Supabase schema and generated types

If the bike-status or reporting contracts change, update and re-check:

- `apps/web/src/lib/supabase/database.types.ts`
- `apps/web/src/lib/supabase/database.aliases.ts`
- the relevant migration in `supabase/migrations/`

### Product-design docs that affect implementation

The staff tablet planning docs now include delivery status and launch-decision artifacts. If those docs change the intended workflow, confirm the implementation tests still match the documented policy.

## Practical commands

From the repo root:

- `pnpm test` for the full monorepo Jest suite.
- `pnpm --filter @glide/web test` for web-only API and component tests.
- `pnpm --filter @glide/web lint` to catch route and Supabase client mistakes.
- `pnpm --filter @glide/web typecheck` to validate the generated database contract and route types.

## Watch outs

- Do not treat route tests as optional when changing the operational APIs; those are the main regression guard.
- If a test failure points to a schema mismatch, resolve the migration/generated-type contract instead of patching the test to fit stale types.
- Keep test coverage aligned with the admin-only behavior in the web routes, especially around status history and operational report generation.
