# Mobile app architecture

## Application shell

`app/_layout.tsx` is the architectural root. It loads Space Grotesk fonts, sets the system background, hides the splash screen once fonts load or time out, wraps the tree in `GestureHandlerRootView`, then provides:

1. `AuthProvider` from `src/features/auth/auth-provider.tsx`.
2. `RideSessionProvider` from `src/features/ride/ride-session-context.tsx`.
3. `RootNavigator`, which waits for auth bootstrap and then renders the protected stack inside `AuthGate`.

`app/index.tsx` is a pure redirect route: authenticated sessions go to `/(tabs)`, otherwise to `/(auth)/welcome`.

## Navigation structure

The primary tab shell lives in `app/(tabs)/_layout.tsx` and exposes:

- Map (`app/(tabs)/index.tsx`)
- Wallet (`app/(tabs)/wallet.tsx`)
- Scan (`app/(tabs)/scan.tsx`), whose tab press is intercepted and redirected to `SCAN_TAB_UNLOCK_HREF`
- Eco (`app/(tabs)/eco.tsx`)
- Profile (`app/(tabs)/profile.tsx`)

The root stack also registers bike details, unlock, active ride, ride history detail modal, ride summary, and support routes. This keeps long-running ride and unlock flows outside the bottom-tab shell while preserving app-level providers.

## Authentication architecture

`src/features/auth/auth-provider.tsx` owns Supabase auth state. Important details:

- Missing Supabase config sets the app to unauthenticated and exposes a config error message.
- Bootstrap restores the Supabase session, and on native can restore tokens from the initial deep link URL.
- Profile reconciliation reads `profiles` by user id and retries up to 8 times with a 250 ms delay before treating the profile as missing.
- Bootstrap has a 5 second timeout.
- Sign-in lowercases email; sign-up lowercases email, trims first name, passes `first_name` in auth metadata, and uses a native `callback` redirect URL outside web.
- If sign-up returns no session, status becomes `awaiting_email_confirmation`.

`src/features/auth/auth-gate.tsx` handles route-level redirects between auth and app routes. Tests in `src/features/auth/auth-provider.test.tsx` and `auth-gate.test.tsx` define the expected edge cases.

## Supabase and service boundary

`src/lib/supabase.ts` creates a typed Supabase client using `Database` from `src/lib/supabase.types.ts`. Storage differs by platform:

- Web uses a localStorage wrapper and `detectSessionInUrl`.
- Native uses AsyncStorage and starts/stops token auto-refresh as AppState changes.

Configured service modules hide runtime data-source selection:

- `src/lib/bike-service.ts` reads bikes from explicit mock, explicit HTTP API, Supabase, HTTP API fallback, or mock fallback. Supabase is preferred when configured unless `EXPO_PUBLIC_BIKE_DATA_SOURCE=api` is set.
- `src/lib/bike-status-service.ts` writes bike status through HTTP `PATCH /bikes/:bikeId/status` with a bearer token. It uses `EXPO_PUBLIC_API_BASE_URL` or derives `http://<expo-host>:3000/api` in local Expo development.
- `src/lib/wallet-service.ts` uses Supabase when configured, otherwise mock `@glide/api` wallet data.
- `src/lib/ride-history-service.ts` uses Supabase `rental_transactions` and the `complete_ride` RPC when configured, otherwise mock data.
- `src/lib/unlock-service.ts` delegates to the mock/API package unlock service.

A key asymmetry: bike reads can fall back among Supabase/API/mock, but bike status writes are HTTP API only. Active ride completion depends on that write succeeding before navigation to summary.

## Native and web rendering split

Some UI has native implementations with default web fallbacks:

- `src/features/map/map-canvas.native.tsx` uses `react-native-maps`; `map-canvas.tsx` is the non-native fallback.
- `src/features/ride/live-ride-route-preview.native.tsx` renders native route preview; `live-ride-route-preview.tsx` is a textual/card fallback.
- `src/features/ride/ride-replay-map.native.tsx` renders native replay; `ride-replay-map.tsx` is a fallback.

When changing map or ride replay behavior, update both variants if the user experience should remain consistent across native and web export.

## Monorepo package resolution

The app imports workspace packages:

- `@glide/shared` for domain types and formatters such as bikes, wallet transactions, ride history, currency, distance, and fare calculations.
- `@glide/api` for mock services, HTTP bike service factory, and seed bike images.

`metro.config.js` watches the workspace root but pins React, React DOM, React Native, and React Native Web to the mobile app's local modules to avoid duplicate React instances. `jest.config.cjs` maps `@glide/api` and `@glide/shared` directly to sibling package source files during tests.

## Architecture watchouts

- Do not assume the placeholder Supabase client means the backend is configured; check `hasSupabaseConfig`.
- Supabase bike reads filter by radius client-side after fetching ordered bike rows. This is simple but may not scale.
- Supabase JSON route/checkpoint fields are cast to shared types without runtime validation.
- Mock fallback for bike network failures is deliberate, but it can hide transient production connectivity issues.
- Native deep-link auth and web auth callback behavior differ by platform.
