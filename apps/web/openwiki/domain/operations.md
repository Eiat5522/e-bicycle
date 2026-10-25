# Operations Domain

This page explains the business workflows implemented by Glide Web. The app is not just a generic admin shell: it encodes e-bike fleet operations, revenue visibility, ride recovery, status auditability, and customer/account support.

## Admin access and account control

Evidence: `src/lib/auth.ts`, `src/app/login/actions.ts`, `src/app/(admin)/layout.tsx`, `src/app/(admin)/actions.ts`, `src/lib/validation.ts`.

Admin access is based on Supabase Auth plus a `profiles` row:

- Login uses Supabase `signInWithPassword()`.
- After login, the app fetches `profiles.is_admin` for the authenticated user.
- Non-admin users are signed out and shown “Admin access is required to use this panel.”
- Protected layouts and server actions redirect unauthenticated or non-admin users to `/login`.

User management supports:

- Creating a Supabase Auth user with confirmed email and password via the service-role admin client.
- Updating the matching profile’s `is_admin` flag after creation.
- Editing existing profile display names and admin flags.
- Validating email format, UUID user IDs, non-empty first names, name length, and minimum password length in `src/lib/validation.ts`.

## Dashboard and executive metrics

Evidence: `src/app/(admin)/dashboard/data.ts`, `src/app/(admin)/dashboard/selectors.ts`, `src/components/admin-dashboard.tsx`, `src/components/executive-scorecard.tsx`, `src/components/operations-dashboard.tsx`.

`loadDashboardViewModels()` gathers the dashboard input in two passes:

1. Concurrent reads for bikes, recent completed `rental_transactions`, wallets, and recent wallet transactions.
2. Conditional reads for active rider profiles and recent `bike_status_events` for bikes currently `in_use`.

Pure selectors then compute two view models:

- `ExecutiveScorecardViewModel` for headline KPIs, trend points, and insight cards.
- `OperationsDashboardViewModel` for live fleet health, target metrics, recent routes, activity feed, low-range watchlist, active ride summary, and payment/fleet aggregates.

Important business logic in `selectors.ts`:

- The reporting window is the last seven days based on `completed_at` for `rental_transactions`.
- Completed revenue sums `rental_transactions.total_cost`; tracked revenue adds current active ride cost using `calculateRideRevenue()` from `@glide/shared`.
- Utilization is based on bikes in `in_use` or `reserved` status over total bikes.
- Active ride summary prefers the latest `ride_start` status event context, then falls back to active fields on the bike row.
- Drop-off state is estimated by distance from hard-coded Bangkok drop-off zones (`Benjakitti Park`, `Lumphini Park West Gate`, `Silom Complex`) with thresholds of `0.25 km` for approaching and `0.05 km` for arrived.
- The watchlist is the four bikes with the lowest `estimated_range_km`.

When changing dashboard behavior, update selector tests rather than only snapshotting UI. The selectors are the canonical place for KPI math and operational assumptions.

## Bicycle lifecycle management

Evidence: `src/app/(admin)/bicycles/page.tsx`, `src/app/(admin)/bicycles/[bikeId]/data.ts`, `src/app/(admin)/bicycles/actions.ts`, `src/components/bicycle-management.tsx`, `src/lib/validation.ts`.

The bicycle workflow covers inventory, telemetry, rider assignment visibility, images, detail history, and CRUD operations.

### List and detail data

The bicycle list reads `bikes` ordered by `updated_at`, counts related `rental_transactions`, and resolves active rider names from `profiles`. Each bike maps to a `ManagedBike` client view model with model, ride class, top speed, pricing, status, active rider, coordinates, last report timestamp, image URL, and timestamps.

The bike detail loader additionally reads:

- `rental_transactions` for that bike, ordered by `completed_at` descending.
- `bike_status_events` for that bike, ordered by `created_at` descending.
- The active rider profile when present.

### Create/update/delete

`src/app/(admin)/bicycles/actions.ts` exposes server actions:

- `createBikeAction()` validates the form, optionally uploads an image to Supabase Storage bucket `bike-images`, inserts a `bikes` row with `estimated_range_km: 0`, revalidates `/bicycles`, and redirects to the new detail page.
- `updateBikeAction()` validates the form, optionally uploads a replacement image, updates the bike, and revalidates list/detail paths.
- `deleteBikeAction()` deletes by uppercased bike ID and redirects to `/bicycles`.

Bike validation enforces ID format (`A-Z`, numbers, dashes, 2-32 chars), required model/pricing/location, non-negative rate, valid status, positive top speed, and valid latitude/longitude.

## Bike status API and audit events

Evidence: `src/app/api/bikes/[bikeId]/status/route.ts`, `src/app/api/bikes/[bikeId]/status-events/route.ts`, `src/lib/supabase/database.types.ts`.

`PATCH /api/bikes/[bikeId]/status` is the primary status transition endpoint. It validates a bearer Supabase auth token with a publishable-key client, then uses a service-role client for the database mutation.

Allowed statuses are `available`, `reserved`, `in_use`, and `maintenance`. Transition rules include:

- Starting a ride (`in_use`) is blocked if another rider already owns the in-use bike.
- Ending a ride (`available`) is allowed only for the active rider.
- Reserving is allowed only from `available`.
- Maintenance is blocked while a bike is `in_use`.
- No-op transitions return the existing bike state.
- Updates include optimistic concurrency checks on prior status and active rider to avoid overwriting a changed bike state.

After a successful update, the route inserts a `bike_status_events` row with `from_status`, `to_status`, `transition_kind`, actor ID, bike ID, and context containing active rider before/after, ride start fields, bike location, requested status, and the source route path. Event insertion failure is logged but does not fail the status response.

`GET /api/bikes/[bikeId]/status-events` validates the bearer token, verifies the caller has an admin profile, and returns mapped status events. This is intended for audit/history views rather than public rider access.

## Ride replay and completed rentals

Evidence: `src/app/(admin)/dashboard/ride-replay/[rideId]/data.ts`, `src/components/ride-replay-detail.tsx`, `src/components/bicycle-management.tsx`.

Ride replay is built from `rental_transactions`, not a separate route telemetry table. The loader selects fare, distance, timing, route, checkpoints, bike, and rider context. The client view shows:

- Bike and rider labels.
- Drop-off/end-location context persisted by mobile.
- Fare and billable-minute details.
- Route telemetry count and checkpoint count.
- A Leaflet-powered replay map using persisted route coordinates.
- Synthetic start/end checkpoints when a ride has route points but no checkpoints.

The replay component normalizes unknown JSON fields to arrays before rendering. If route coordinates are missing, it shows a “Route unavailable” state instead of failing.

## Users, wallets, and support context

Evidence: `src/app/(admin)/users/page.tsx`, `src/components/user-management-table.tsx`, `src/app/(admin)/actions.ts`.

The users page reads:

- `profiles` ordered by `created_at`.
- `wallet_transactions` ordered by `created_at`.
- `rental_transactions` joined to bike model data where `profile_id` is present.

It groups transactions and rides by profile ID and renders a support-oriented user table/drawer. For each user, admins can inspect transaction history, ride history, account/admin status, and make profile edits.

One important implementation detail: wallet transactions are grouped by `wallet_id`, and profiles are looked up by profile ID. Generated types show `wallets.id` has no explicit relationship in the web app types. If wallet IDs ever diverge from profile IDs, the grouping logic in `src/app/(admin)/users/page.tsx` will need a wallet-to-profile join or schema adjustment.

## Domain extension guidance

- Add new operational metrics in `src/app/(admin)/dashboard/selectors.ts` first, with selector tests, then expose them through components.
- Keep status transition rules in the API route or a shared pure function; do not duplicate them in UI only.
- Treat `rental_transactions` as the current ride-history source unless schema/history evidence says otherwise.
- When adding tables/columns, update generated Supabase types and schema-contract tests before changing data loaders.
- Keep admin-only mutations behind `requireAdmin()` or explicit bearer-token plus profile checks.
