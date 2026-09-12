# Architecture Overview

Glide Web is a server-first Next.js App Router application. Server Components and server actions own Supabase data access, while client components focus on interactive dashboards, drawers, forms, maps, and optimistic UI state.

## Runtime shape

Evidence: `src/app/layout.tsx`, `src/app/(admin)/layout.tsx`, `src/app/login/page.tsx`, `next.config.ts`.

- `src/app/layout.tsx` defines global metadata, favicon assets, Manrope/Space Grotesk fonts, and imports `src/app/globals.css`.
- `src/app/login/page.tsx` is public. It redirects already-authenticated admins to `/` and otherwise renders `LoginHeroScene` plus `LoginForm`.
- `src/app/(admin)/layout.tsx` is the protected shell. It calls `requireAdmin()` before rendering navigation, profile context, and sign-out controls.
- `next.config.ts` allows Wikimedia remote images and transpiles `@glide/api` and `@glide/shared`, because this package runs inside a workspace.

## Route map

### Public route

- `/login` — public admin sign-in screen and Supabase password login (`src/app/login/page.tsx`, `src/app/login/actions.ts`, `src/app/login/login-form.tsx`).

### Protected admin routes

All routes below live under `src/app/(admin)` and inherit `requireAdmin()` from the layout unless their data loader also calls it directly:

- `/` — home dashboard wrapper using the same view model loader as `/dashboard` (`src/app/(admin)/page.tsx`).
- `/dashboard` — executive/operations dashboard (`src/app/(admin)/dashboard/page.tsx`, `src/app/(admin)/dashboard/data.ts`).
- `/dashboard/ride-replay/[rideId]` — ride replay detail page (`src/app/(admin)/dashboard/ride-replay/[rideId]/page.tsx`, `data.ts`).
- `/dashboard/@replay/(.)ride-replay/[rideId]` — parallel/intercepted route that can render ride replay as a drawer.
- `/bicycles` — fleet list (`src/app/(admin)/bicycles/page.tsx`).
- `/bicycles/new` — create-bike page using server actions from `bicycles/actions.ts`.
- `/bicycles/[bikeId]` — bike detail page with ride/status history (`src/app/(admin)/bicycles/[bikeId]/data.ts`).
- `/bicycles/@drawer/(.)[bikeId]` — intercepted drawer variant for bicycle detail.
- `/users` — user/profile, ride history, and wallet transaction management (`src/app/(admin)/users/page.tsx`).

### API routes

- `GET /api/bikes/[bikeId]/status-events` validates a bearer token, checks the user is an admin profile, and returns mapped status events for that bike (`src/app/api/bikes/[bikeId]/status-events/route.ts`).
- Authenticated bike-status transitions use the `update_bike_status_with_event` database RPC, which atomically applies an expected-state update and writes the corresponding `bike_status_events` row (`supabase/migrations/20260714000000_atomic_bike_status_update.sql`).

## Server/client boundaries

The dominant pattern is:

1. Server route/page loads raw Supabase rows.
2. A small mapper or selector converts database snake_case rows to view-model objects.
3. A client component renders interaction-heavy UI.

Examples:

- Dashboard data is loaded by `loadDashboardViewModels()` in `src/app/(admin)/dashboard/data.ts`, then shaped by pure selectors in `selectors.ts` and rendered by `AdminDashboard`, `ExecutiveScorecard`, and `OperationsDashboard`.
- Bicycle list/detail data is loaded by server pages/data modules and rendered by the client component `BicycleManagementList` and related detail/replay helpers in `src/components/bicycle-management.tsx`.
- User data is loaded by `src/app/(admin)/users/page.tsx` and rendered/edited by `src/components/user-management-table.tsx` using server actions from `src/app/(admin)/actions.ts`.
- Ride replay data is loaded by `getRideReplayDetail()` and rendered by `RideReplayDetail`; the route map itself is a client-side Leaflet integration reused from `RideRouteMap`.

This separation matters for future changes: prefer keeping Supabase access and validation on the server side, and keep client components focused on presentation and interaction.

## Auth architecture

Evidence: `src/lib/auth.ts`, `src/lib/supabase/server.ts`, `src/app/login/actions.ts`, `src/app/(admin)/actions.ts`.

- `createClient()` wraps `@supabase/ssr` with Next cookies and generated `Database` types.
- `getAuthContext()` returns `null` when Supabase config is missing or no auth session exists; otherwise it fetches the current user and matching `profiles` row.
- `requireAdmin()` redirects to `/login` unless the profile exists and `is_admin` is true.
- `signInAction()` validates email/password, verifies the Supabase session, checks `profiles.is_admin`, signs out non-admins, and redirects admins to `/`.
- Server actions that mutate users call their own `requireAdminForAction()` guard before using either the SSR client or service-role admin client.

## Supabase client architecture

- `src/lib/supabase/config.ts` reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, exposes `hasSupabaseConfig`, and throws actionable errors when config is absent.
- `src/lib/supabase/server.ts` creates cookie-aware server clients for user-scoped reads and writes.
- `src/lib/supabase/admin.ts` creates a service-role client using `SUPABASE_SERVICE_ROLE_KEY`; it disables session persistence and token refresh.
- `src/lib/supabase/client.ts` is available for browser clients, but the inspected major workflows primarily use server-side clients.

## UI composition

Evidence: `src/components/admin-dashboard.tsx`, `src/components/admin-shell.tsx`, `src/components/operations-dashboard.tsx`, `src/components/bicycle-management.tsx`, `src/components/user-management-table.tsx`.

The UI uses a claymorphic visual system built from global CSS classes such as `clay-card`, `clay-inset`, `clay-button`, and component-specific CSS variables. Major reusable components include:

- `AdminShell` and `AdminNav` for the protected shell and dashboard mode switching.
- `AdminDashboard`, `ExecutiveScorecard`, and `OperationsDashboard` for dashboard composition.
- `BicycleManagementList`, detail drawers, and `RideRouteMap` for fleet operations and route replay.
- `UserManagementTable` for user creation/editing and history inspection.
- `SideDrawer`/`DrawerCloseButton` and `StatusToast` for cross-workflow interaction affordances.

## Architectural watchouts

- Next.js is version `16.2.3`; `AGENTS.md` explicitly warns that Next APIs/conventions may differ from older training data and recommends checking `node_modules/next/dist/docs/` before source edits.
- API route context params are handled as either a Promise or object in bike routes, which appears intentional for compatibility with current Next route handler behavior.
- Dashboard selectors contain business assumptions such as hard-coded Bangkok drop-off zones and target thresholds. Keep those in selectors/tests rather than scattering them across components.
- The app currently reads `rental_transactions` for ride history and replay. Older `bike_ride_history` types still exist in generated types, but recent git history indicates the current workflow moved to rental transactions.
