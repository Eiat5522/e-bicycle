# Supabase Data and Integrations

Supabase is the app’s primary backend for authentication, authorization, operational data, and bike image storage. This page focuses on what the web app directly uses.

## Configuration and clients

Evidence: `.env.example`, `src/lib/supabase/config.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`, `src/lib/auth.ts`.

Expected environment variables:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable key used by SSR/user-scoped clients and bearer-token validation clients.
- `SUPABASE_SERVICE_ROLE_KEY` — privileged server-only key used for admin operations. Never expose it to browser code.

Client modules:

- `getSupabaseConfig()` throws if URL or publishable key is missing. `hasSupabaseConfig` lets auth checks return `null` instead of crashing when config is absent.
- `createClient()` in `src/lib/supabase/server.ts` creates a cookie-aware Supabase SSR client typed with `Database`.
- `createAdminClient()` in `src/lib/supabase/admin.ts` creates a service-role client with session persistence and auto-refresh disabled.

## Auth and authorization model

Supabase Auth identifies the user. The app’s admin authorization is a separate `profiles.is_admin` check.

- Login signs in with email/password, then fetches `profiles.is_admin` for the Supabase Auth user (`src/app/login/actions.ts`).
- Protected admin routes use `requireAdmin()` (`src/lib/auth.ts`).
- Server mutations use `requireAdmin()`/`requireAdminForAction()` where they are limited to administrators.
- Bike status transitions use the authenticated `update_bike_status_with_event` database RPC, which atomically applies the expected-state update and records the matching `bike_status_events` row.
- The surviving status-events read route validates a bearer token, requires an admin profile, and exposes transition history to the admin UI.

## Tables used by the web app

Evidence: `src/lib/supabase/database.types.ts`, dashboard/bicycle/user data loaders, API routes.

### `profiles`

Used for admin authorization, display names, active rider labels, and user management. Key fields used by this app:

- `id`
- `first_name`
- `is_admin`
- `created_at`
- `updated_at`

### `bikes`

Core fleet table. The web app reads and writes operational fields including:

- identity and display: `id`, `model`, `ride_class`, `image_url`
- pricing: `pricing_label`, `rate_per_minute`
- telemetry/location: `location`, `latitude`, `longitude`, `estimated_range_km`, `last_reported_at`
- state: `status`, `active_rider_id`, `active_ride_started_at`, `active_ride_start_location`
- hardware/schema fields visible in generated types but not all rendered: `battery_status`, `device_status`, `current_battery_id`, `station_id`, serial/frame/QR fields

Valid web status values are the `bike_status` enum values used in code: `available`, `reserved`, `in_use`, `maintenance`.

### `bike_status_events`

Audit trail for bike status transitions. Rows include:

- `id`
- `bike_id`
- `actor_id`
- `from_status`
- `to_status`
- `transition_kind`
- `context` JSON
- `created_at`

The `update_bike_status_with_event` RPC writes these events atomically with successful status transitions. Dashboard active-ride recovery reads recent `ride_start` events for currently in-use bikes. Bicycle detail and the status-events API expose event history.

### `rental_transactions`

Current source of completed ride history and replay data. Key fields used:

- relationship fields: `id`, `bike_id`, `profile_id`, `wallet_transaction_id`
- timing/distance: `started_at`, `completed_at`, `duration_sec`, `distance_km`
- pricing/fare: `total_cost`, `rate_per_minute`, `billable_minutes`, `currency_code`, `fare_calculation_method`, `payment_label`
- sustainability/context: `co2_saved_kg`, `start_location`, `end_location`, `route_label`
- telemetry JSON: `route`, `checkpoints`
- operational fields in generated types: station/payment/staff/import/reconciliation/source-system fields

Recent git history indicates ride-history reads switched to `rental_transactions`; prefer it over older `bike_ride_history` unless current source evidence changes.

### `wallets` and `wallet_transactions`

Dashboard and user support views use:

- `wallets`: `id`, `balance`, `points`, `payment_methods`, timestamps.
- `wallet_transactions`: `id`, `wallet_id`, `type`, `title`, `subtitle`, `amount`, `created_at`.

Dashboard metrics summarize wallet balances, payment method counts, and latest wallet events. The users page groups wallet transactions by `wallet_id`; verify wallet/profile identity assumptions before changing account data behavior.

### Other generated schema areas

Generated types include many operational tables beyond current web usage, such as `incidents`, `maintenance_logs`, `stations`, payments, staff profiles, batteries, and operational import/reconciliation fields. Do not assume these are wired into the web UI just because they appear in `database.types.ts`; inspect route/data loaders before documenting behavior as active.

## Storage integration

Evidence: `src/app/(admin)/bicycles/actions.ts`.

Bike image uploads use Supabase Storage bucket `bike-images`:

- File names are sanitized to alphanumeric, dot, and dash characters.
- Upload path is `${bikeId}/${Date.now()}-${filename}`.
- Uploads use `cacheControl: "3600"` and `upsert: false`.
- The public URL from `getPublicUrl()` is stored as `bikes.image_url`.

If storage access changes, update both create and update bike actions.

## Service-role usage

Service-role access is intentionally narrow and server-only:

- Creating users through Supabase Auth admin API (`src/app/(admin)/actions.ts`).
- Updating profile admin flags after user creation.
- The admin-only bike status-events read path, after bearer-token validation and an admin profile check (`src/app/api/bikes/[bikeId]/status-events/route.ts`).

Never import `createAdminClient()` into client components. If adding service-role behavior, add a server-side auth/authorization guard first and document the rationale.

## Schema and type safety

The web app uses generated `Database` types from `src/lib/supabase/database.types.ts`. Tests include `src/lib/supabase/schema-contract.test.ts`, which exists to catch drift between expected app queries and the generated schema contract.

When changing schema-dependent code:

1. Apply/update Supabase migrations in the monorepo source of truth.
2. Regenerate `database.types.ts` for web and other clients.
3. Update affected selectors/data loaders.
4. Run schema-contract tests, related data-loader tests, and `pnpm typecheck`.

## Privacy and secrets

- `.env.local` is intentionally not inspected or documented.
- Documentation may name environment variables, but must not copy real secret values.
- `NEXT_PUBLIC_*` values are publishable by design, but the service role key must remain server-only.
