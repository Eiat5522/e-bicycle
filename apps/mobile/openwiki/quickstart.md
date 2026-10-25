# Glide Mobile OpenWiki

Glide Mobile is the customer-facing Expo + React Native app for an e-bike rental experience. It lets riders authenticate, find nearby bikes, unlock a bike, track an active ride, end the ride into Supabase-backed rental history, manage wallet top-ups, and review eco/reward progress.

This wiki is scoped to the mobile app rooted at `apps/mobile`. It references sibling workspace packages (`@glide/api`, `@glide/shared`) and the admin/API boundary only where the mobile app imports them or calls HTTP endpoints.

## Start here

- [Mobile app architecture](architecture/mobile-app.md) explains the Expo Router shell, providers, route layout, service layer, Supabase client, and native/web fallbacks.
- [Rider journey workflows](workflows/rider-journey.md) follows the user-facing flows from authentication through map, unlock, active ride, history, wallet, eco, profile, and support.
- [Ride and wallet domain rules](domain/ride-and-wallet.md) captures business logic for bike status, fare, CO₂, drop-off guidance, wallet top-ups, and reward milestones.
- [Testing and change guide](operations/testing-and-change-guide.md) lists setup, scripts, tests, schema-contract checks, and high-risk change areas.

## What runs this app

The root package is `@glide/mobile` (`package.json`) with `expo-router/entry` as its main entrypoint. If running from the repository root, use the pnpm workspace-filtered scripts:

```bash
pnpm --filter @glide/mobile dev        # start mobile app in dev mode (expo start)
pnpm --filter @glide/mobile test       # run mobile jest tests
pnpm --filter @glide/mobile typecheck  # run mobile type checks
pnpm --filter @glide/mobile lint       # run mobile eslint
pnpm --filter @glide/mobile build      # export mobile static web assets
```

Alternatively, you can run these commands from the `apps/mobile` directory using the local scripts (e.g., `pnpm dev`, `pnpm test`, etc.).

Expo configuration in `app.json` names the app `Glide`, uses URL scheme `glide`, enables Expo Router, static web export, new architecture, and typed routes.

## Required configuration

`README.md` and `.env.example` document public runtime variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_BIKE_DATA_SOURCE`

Do not read or commit live `.env.local` values. `src/lib/supabase.ts` creates a typed Supabase client with placeholder values if config is absent and exports `hasSupabaseConfig`; service code must use that flag carefully.

## Route map

Expo Router files under `app/` define the main surface:

- `app/_layout.tsx` loads fonts, wraps the app in `AuthProvider` and `RideSessionProvider`, applies `AuthGate`, and declares stack routes.
- `app/index.tsx` redirects authenticated users to `/(tabs)` and unauthenticated users to `/(auth)/welcome`.
- `app/(auth)/` contains welcome, login, signup, and callback routes.
- `app/(tabs)/_layout.tsx` defines Map, Wallet, Scan, Eco, and Profile tabs. The Scan tab intercepts tab presses and pushes the unlock route.
- `app/bike/[id].tsx`, `app/unlock/[id].tsx`, `app/ride/active.tsx`, `app/ride/summary.tsx`, `app/ride/history/[id].tsx`, and `app/help/index.tsx` host the non-tab workflows.

## Major source areas

- `src/features/auth/` — Supabase auth provider, auth gate, login/signup/welcome screens.
- `src/features/map/` and `src/features/bike/` — location permission, nearby bike search, native map markers, bike drawer/details.
- `src/features/unlock/` — QR/Bluetooth simulated unlock transaction and status sync handoff.
- `src/features/ride/` — active ride session persistence, live tracking, route previews, summary/history/replay screens.
- `src/features/wallet/` — wallet balance, top-up methods, PromptPay/mobile banking/TrueMoney/voucher UI.
- `src/features/eco-impact/` — aggregate ride stats, CO₂ equivalents, streaks, badges.
- `src/features/profile/` and `src/features/support/` — rider profile, ride history list, support scaffolding.
- `src/lib/` — Supabase client/types and configured service adapters for bikes, bike status, ride history, wallet, unlock, rewards.
- `src/theme/` and `src/components/` — design tokens and shared UI primitives.

## Recent evolution

Recent git history shows the mobile app moving from mocked flows toward operational Supabase-backed rides and wallet data: MVP schema/types and schema contract tests were added, ride history reads moved to `rental_transactions`, active ride recovery and bike release retry handling were introduced, and wallet UI was updated to present live transaction types. Use that context when evaluating whether a behavior is a production integration or still a simulated/mobile-only experience.

## Fast guidance for future agents

1. Start with this page, then read the most relevant section page rather than scanning every source file.
2. For flow changes, inspect the route file in `app/` and the implementation under `src/features/<domain>/`.
3. For data/integration changes, inspect the configured service in `src/lib/` and its tests.
4. For database shape assumptions, inspect `src/lib/supabase.types.ts` and `src/lib/schema-contract.test.ts`; the test checks TypeScript shape, not a live database.
5. Preserve the split where bike reads can use Supabase/API/mock, while bike status writes go through an HTTP API endpoint.
