# Testing and Operations

This page summarizes how to run and reason about the web app locally, and which checks matter for common changes.

## Package scripts

Evidence: `package.json`, `README.md`.

From a clean checkout, install dependencies from the repository root first:

```bash
pnpm install
```

Then run package scripts from `apps/web`:

```bash
pnpm dev              # local Next dev server
pnpm build            # production Next build
pnpm start            # serve built app
pnpm lint             # ESLint over src and config files
pnpm test             # Jest, run in band
pnpm typecheck        # TypeScript no-emit check
pnpm test:integration # Playwright integration tests
pnpm test:e2e         # Playwright e2e tests
pnpm test:e2e:ui      # Playwright UI runner for e2e specs
pnpm test:e2e:headed  # headed e2e run
pnpm test:e2e:debug   # Playwright debug mode
```

Note: `package.json` also contains a misspelled `istall` script (`next install`). Do not rely on it as a normal install command.

## Jest setup

Evidence: `jest.config.js`, `jest.setup.js`, `src/**/*.test.*`.

Jest uses `next/jest` with:

- `testEnvironment: "jsdom"`
- tests matched under `src/**/*.test.[jt]s?(x)`
- cache under `.jest-cache`
- temporary files under `.jest-tmp`
- `@/` mapped to `src/`
- `@glide/api` mapped to `../../packages/api/src/index.ts`
- `@glide/shared` mapped to `../../packages/shared/src/index.ts`

The important tested areas visible in source include:

- Auth helpers and login actions/forms.
- Supabase config/server/admin client behavior.
- Dashboard data/selectors and dashboard components.
- Bicycle management list/detail/actions/API status routes.
- User management table and form state.
- Ride replay detail and route map behavior.
- Schema-contract tests for generated Supabase types.

Use focused Jest runs while iterating, then `pnpm test` before finishing broader changes.

## Playwright setup

Evidence: `playwright.config.ts`, `tests/integration/public-routing.spec.ts`, `tests/e2e/login.spec.ts`, `tests/helpers/auth.ts`.

Playwright test directory is `./tests` with a Chromium desktop project. It runs fully parallel by default and uses:

- HTML and list reporters.
- trace on first retry.
- screenshot only on failure.
- video retained on failure.
- one worker in CI.

If `PLAYWRIGHT_BASE_URL` is not set, Playwright starts a production-like server with:

```bash
pnpm build && pnpm exec next start --hostname 127.0.0.1 --port 3100
```

Set `PLAYWRIGHT_BASE_URL` to point tests at an already-running server. Install Chromium once with:

```bash
pnpm exec playwright install chromium
```

Current Playwright coverage is intentionally small:

- `/login` renders the admin sign-in form.
- `/` and `/dashboard` redirect unauthenticated visitors to `/login`.

Expand Playwright when changing public routing, auth redirects, route interception/drawers, or flows that need browser-level confidence.

## Change-oriented checklists

### Auth or authorization changes

Relevant files:

- `src/lib/auth.ts`
- `src/app/login/actions.ts`
- `src/app/login/login-form.tsx`
- `src/app/(admin)/layout.tsx`
- `src/app/(admin)/actions.ts`
- `tests/e2e/login.spec.ts`
- `tests/integration/public-routing.spec.ts`

Recommended checks:

```bash
pnpm test -- src/lib/auth.test.ts src/app/login/actions.test.ts src/app/login/login-form.test.tsx
pnpm test:integration
pnpm typecheck
```

### Dashboard metric changes

Relevant files:

- `src/app/(admin)/dashboard/data.ts`
- `src/app/(admin)/dashboard/selectors.ts`
- `src/components/executive-scorecard.tsx`
- `src/components/operations-dashboard.tsx`

Recommended checks:

```bash
pnpm test -- "src/app/(admin)/dashboard/data.test.ts" "src/app/(admin)/dashboard/selectors.test.ts" src/components/operations-dashboard.test.tsx src/components/executive-scorecard.test.tsx
pnpm typecheck
```

Keep calculations in selectors and cover business thresholds in selector tests.

### Bicycle or status lifecycle changes

Relevant files:

- `src/app/(admin)/bicycles/page.tsx`
- `src/app/(admin)/bicycles/[bikeId]/data.ts`
- `src/app/(admin)/bicycles/actions.ts`
- `src/app/api/bikes/[bikeId]/status/route.ts`
- `src/app/api/bikes/[bikeId]/status-events/route.ts`
- `src/components/bicycle-management.tsx`
- `src/lib/validation.ts`

Recommended checks:

```bash
pnpm test -- "src/app/api/bikes/[bikeId]/status/route.test.ts" "src/app/api/bikes/[bikeId]/status-events/route.test.ts" "src/app/(admin)/bicycles/[bikeId]/data.test.ts" src/components/bicycle-management.test.tsx src/lib/validation.test.ts
pnpm typecheck
```

For status transitions, verify both authorization and concurrency cases.

### User, wallet, or ride history changes

Relevant files:

- `src/app/(admin)/users/page.tsx`
- `src/app/(admin)/actions.ts`
- `src/components/user-management-table.tsx`
- `src/app/(admin)/dashboard/ride-replay/[rideId]/data.ts`
- `src/components/ride-replay-detail.tsx`

Recommended checks:

```bash
pnpm test -- src/components/user-management-table.test.tsx "src/app/(admin)/users/page.test.tsx" src/components/ride-replay-detail.test.tsx "src/app/(admin)/dashboard/ride-replay/[rideId]/data.test.ts"
pnpm typecheck
```

### Supabase schema/query changes

Relevant files:

- `src/lib/supabase/database.types.ts`
- `src/lib/supabase/schema-contract.test.ts`
- any route/data loader that selects changed columns

Recommended checks:

```bash
pnpm test -- src/lib/supabase/schema-contract.test.ts
pnpm test
pnpm typecheck
```

If a query starts failing type checks, prefer fixing generated types/schema/query shape over casting away the mismatch.

## Known operational notes

- `README.md` documents a known development-time `THREE.Clock` deprecation warning from the installed `@react-three/fiber`/`three` pair. The current decision is to keep stable versions and treat it as non-breaking noise.
- Next.js is a current/breaking version. The local `AGENTS.md` asks agents to read relevant `node_modules/next/dist/docs/` guidance before source edits.
- Source instruction files are authoritative. Do not hand-edit generated pages under `apps/web/openwiki/*.md` during routine documentation updates; modify the source code or instruction docs and let OpenWiki regenerate them.
