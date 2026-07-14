# Testing and change guide

## Local setup

From this mobile app root:

```bash
pnpm dev
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

`README.md` documents Supabase setup. Copy `.env.example` to `.env.local` locally, but never inspect or commit live secret values. Public variables used by the app are:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_BIKE_DATA_SOURCE`

For hosted Supabase work, the README notes project linking with `supabase link --project-ref lcqxsopihpwhbvwrttvw`, `supabase db push` for migrations, and avoiding `supabase db reset` unless intentionally resetting a disposable local sandbox.

## Test configuration

`jest.config.cjs` uses `jest-expo`, limits roots to `src`, maps `@/*` to `src/*`, and maps `@glide/api` / `@glide/shared` to sibling package source. Tests run serially via `pnpm test`.

`metro.config.js` is monorepo-aware and pins React/React Native resolution to the app-local copies. If tests or Metro show duplicate React/hook errors, inspect this file before changing package versions.

`tsconfig.json` extends Expo and the monorepo base config, enables strict mode, and includes Expo Router generated types plus Jest types.

## High-value test suites

Use targeted tests when changing a domain:

- Auth: `src/features/auth/auth-provider.test.tsx`, `auth-gate.test.tsx`, `login-screen.test.tsx`, `signup-screen.test.tsx`.
- Map and bike reads: `src/features/map/map-screen.test.tsx`, `marker-colors.test.ts`, `src/lib/bike-service.test.ts`.
- Bike status writes: `src/lib/bike-status-service.test.ts`.
- Unlock: `src/features/unlock/unlock-screen.test.tsx`.
- Active ride and tracker: `src/features/ride/active-ride-screen.test.tsx`, `live-ride-tracker.test.ts`.
- Ride history/summary/detail: `src/lib/ride-history-service.test.ts`, `ride-summary-screen.test.tsx`, `ride-history-detail-screen.test.tsx`.
- Wallet: `src/features/wallet/wallet-screen.test.tsx`, `src/lib/wallet-service.test.ts`, `bank-logo-map.test.ts`.
- Profile: `src/features/profile/profile-screen.test.tsx`.
- Shared UI/navigation: `src/components/primary-button.test.tsx`, `src/navigation/tab-bar-style.test.ts`.

## Schema contract

`src/lib/schema-contract.test.ts` checks that the generated `Database` type exposes expected operational fields such as bike QR/status/device fields, rental transaction status/source/reconciliation fields, stations, batteries, payments, and attachments. This protects TypeScript assumptions after schema changes, but it does not query a live database.

When Supabase migrations or generated types change, run at least:

```bash
pnpm test -- src/lib/schema-contract.test.ts
pnpm typecheck
```

Then run domain tests for any service touched by the schema change.

## Data-source and integration pitfalls

- Missing Supabase config still creates a placeholder Supabase client. Runtime behavior depends on `hasSupabaseConfig` checks.
- Bike reads can silently fall back to mock data on recoverable network failures. Be careful when debugging production-like data issues.
- Bike status writes require `EXPO_PUBLIC_API_BASE_URL` or an Expo dev host from which the service derives `http://<host>:3000/api`.
- End ride intentionally does not navigate to summary if bike release sync fails; it stores a pending release retry instead.
- Wallet and ride history Supabase services require an active session and throw if no current user exists.
- Web builds use fallback map/replay components, so native map changes may not be visible in `expo export --platform web`.

## Suggested change workflow for future agents

1. Identify the user-facing route in `app/`.
2. Read the corresponding feature screen under `src/features/`.
3. Read the service module under `src/lib/` if the change touches data.
4. Read the nearest tests before editing; most business rules are test-backed.
5. After changes, run the smallest relevant test first, then `pnpm typecheck`, then broader `pnpm test` if feasible.
6. If a change affects shared types or API mocks, inspect sibling packages through the import path used by `jest.config.cjs` rather than assuming mobile owns the type.

## Git/history notes

Recent commits show these areas are active and should be treated carefully:

- MVP operational schema and generated Supabase types.
- Active ride recovery, persisted sessions, bike status events, and pending release retry behavior.
- Ride history migration to `rental_transactions`.
- Wallet transaction presentation and live transaction types.
