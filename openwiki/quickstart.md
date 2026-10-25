# Glide Web OpenWiki Quickstart

Glide Web is the Next.js admin surface for an e-bike rental and operations platform. It gives authenticated administrators a live operations dashboard, fleet/bicycle management, user and wallet history, and ride replay tooling backed by Supabase.

This wiki is scoped to `apps/web` in the larger `e-bicycle` workspace. It documents the web/admin package, while noting where it depends on workspace packages and shared Supabase schema generated outside this app.

## Start here

- [Architecture overview](architecture/overview.md) explains the App Router shape, server/client boundaries, Supabase clients, and route map.
- [Operations domain](domain/operations.md) explains the product workflows: admin auth, dashboards, bicycle lifecycle, ride replay, users, wallets, and status events.
- [Supabase data and integrations](data-and-integrations/supabase.md) explains the tables, environment variables, storage, and service-role integration this app uses.
- [Testing and operations](operations/testing.md) explains scripts, Jest/Playwright setup, and change checklists.

## What the app does

The app is an admin panel for “Glide Operations”:

- `/login` presents a claymorphic sign-in page with a Three.js hero scene and validates Supabase email/password auth before allowing admin users through (`src/app/login/page.tsx`, `src/app/login/actions.ts`).
- The protected admin layout gates all `(admin)` routes through `requireAdmin()`, then renders admin navigation and sign-out controls (`src/app/(admin)/layout.tsx`, `src/lib/auth.ts`).
- `/` and `/dashboard` load executive and operations view models from live Supabase rows: bikes, rental transactions, wallets, wallet transactions, active rider profiles, and recent bike status events (`src/app/(admin)/page.tsx`, `src/app/(admin)/dashboard/data.ts`).
- `/bicycles` manages fleet records, bike images, current status, active rider labels, and ride counts (`src/app/(admin)/bicycles/page.tsx`, `src/app/(admin)/bicycles/actions.ts`).
- `/bicycles/[bikeId]` shows detail, ride history, and bike status history; the same detail can appear in a parallel-route drawer (`src/app/(admin)/bicycles/[bikeId]/data.ts`).
- `/dashboard/ride-replay/[rideId]` replays persisted route/checkpoint telemetry from `rental_transactions` (`src/app/(admin)/dashboard/ride-replay/[rideId]/data.ts`, `src/components/ride-replay-detail.tsx`).
- `/users` lets admins create users, edit profile/admin flags, and inspect ride and wallet histories (`src/app/(admin)/users/page.tsx`, `src/app/(admin)/actions.ts`).
- `GET /api/bikes/[bikeId]/status-events` provides admin-only status-history reads (`src/app/api/bikes/[bikeId]/status-events/route.ts`); authenticated status transitions use the `update_bike_status_with_event` database RPC, which atomically updates the bike and writes its audit event.

## Technology stack

Evidence: `package.json`, `next.config.ts`, `README.md`, `jest.config.js`, `playwright.config.ts`.

- Next.js `16.2.3` with App Router, React `19.2.4`, and TypeScript.
- Tailwind CSS v4-style global styling plus app-specific claymorphic CSS in `src/app/globals.css`.
- Supabase SSR/auth and generated database types in `src/lib/supabase/`.
- Workspace dependencies: `@glide/shared` and `@glide/api` are transpiled by Next (`next.config.ts`) and mapped directly to `../../packages/.../src/index.ts` for Jest (`jest.config.js`).
- UI libraries include `@react-three/fiber`/`three` for the login hero, `leaflet` for ride replay maps, and `recharts` for dashboard trends.
- Jest tests run in jsdom; Playwright covers public routing and login smoke flows.

## Local setup

From a clean checkout, install workspace dependencies from the repository root first:

```bash
pnpm install
```

Then use package scripts from `apps/web/package.json`:

```bash
pnpm --filter @glide/web dev
pnpm --filter @glide/web build
pnpm --filter @glide/web test
pnpm --filter @glide/web typecheck
pnpm --filter @glide/web test:integration
pnpm --filter @glide/web test:e2e
```

Before first Playwright use, install Chromium as documented in `README.md`:

```bash
pnpm exec playwright install chromium
```

Playwright starts a production-like Next server on port `3100` unless `PLAYWRIGHT_BASE_URL` points at an existing server (`playwright.config.ts`).

## Environment variables

Do not commit real secrets. `.env.local` exists locally but should not be read or documented. `.env.example` lists the app’s expected variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` for privileged server-only admin operations such as user creation and status-event history reads

See [Supabase data and integrations](data-and-integrations/supabase.md) for where each variable is used.

## Current repository context

Recent git history shows the app has evolved from initial admin dashboard work into MVP operational schema support, active ride recovery/status events, and a switch from older ride history reads to `rental_transactions`. Future agents should treat `rental_transactions`, `bike_status_events`, and generated Supabase types as the current source of truth for operations workflows.

## Where future agents should start

1. Read this page, then [Operations domain](domain/operations.md) for the workflow being changed.
2. Inspect the route/page and data loader first, then the component view model or client component.
3. For Supabase changes, verify generated types and schema-contract tests before editing queries.
4. Run the narrowest relevant Jest tests, then `pnpm typecheck`; use Playwright when route/auth behavior changes.
