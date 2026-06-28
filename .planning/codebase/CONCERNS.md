# Codebase Concerns

**Analysis Date:** 2026-06-27

## Security Considerations

### Secret Leaked in Git — `.env.local`
**Issue:** `.env.local` contains a `NANOBANANA_API_KEY` value and is **committed to the repository**. While `.env.local` is listed in `.gitignore`, the file exists in the working tree and is tracked in Git.
- **Files:** `.env.local`
- **Impact:** API key exposed to anyone with repo access.
- **Fix approach:** Rotate the key, untrack `.env.local` from Git, ensure it is ignored in `.gitignore`, and use a secret manager or neutral placeholders instead of committing actual values.

### Service Role Key Used Client-Adjacent
**Issue:** `apps/web/src/lib/supabase/admin.ts` reads `SUPABASE_SERVICE_ROLE_KEY` from `process.env` and creates a Supabase admin client. This key grants full database access bypassing RLS. It is used in Server Actions (`apps/web/src/app/(admin)/actions.ts`) and API routes (`apps/web/src/app/api/bikes/[bikeId]/status/route.ts`) — if any of these are ever exposed to the client bundle, the key leaks.
- **Files:** `apps/web/src/lib/supabase/admin.ts`, `apps/web/src/app/(admin)/actions.ts`, `apps/web/src/app/api/bikes/[bikeId]/status/route.ts`
- **Impact:** Catastrophic data breach if leaked.
- **Current mitigation:** Used only in Server Components and Route Handlers (never `"use client"`).
- **Recommendations:** Add a build-time validation that `SUPABASE_SERVICE_ROLE_KEY` is never imported in client code. Consider moving admin operations to a separate internal API.

### Seed Passwords Committed to Git
**Issue:** `supabase/seed.sql` contains plaintext bcrypt-hashed seed passwords for four users (`admin@glide.local`, `maya@glide.local`, `niran@glide.local`, `suda@glide.local`) with predictable passwords (`glide-admin-123`, `glide-rider-123`). While bcrypt-hashed, these are still committed secrets.
- **Files:** `supabase/seed.sql`
- **Impact:** Any deployment using this seed has well-known test credentials.
- **Recommendation:** Add a `--seed` flag that prompts for passwords. Use environment variables or a separate `.secrets` file for seed credentials.

### No Rate Limiting on Auth or API Routes
**Issue:** The login action (`apps/web/src/app/login/actions.ts`) and the bike status API route (`apps/web/src/app/api/bikes/[bikeId]/status/route.ts`) have no rate limiting or brute-force protection.
- **Files:** `apps/web/src/app/login/actions.ts`, `apps/web/src/app/api/bikes/[bikeId]/status/route.ts`
- **Impact:** Susceptible to brute-force attacks and DoS.
- **Recommendation:** Add rate limiting via middleware or a service like Upstash/Arc.

### No Content Security Policy Headers
**Issue:** No CSP or security headers configured in Next.js (`next.config.ts`).
- **Files:** `apps/web` (check `next.config.ts`)
- **Impact:** Vulnerable to XSS if user-generated content is rendered.
- **Recommendation:** Set `Content-Security-Policy`, `X-Frame-Options`, and other security headers in Next.js config or middleware.

### Open Bike Images Storage Bucket
**Issue:** `supabase/migrations/20260413133749_add_bicycle_admin_management_v2.sql` creates a `bike-images` storage bucket that is **public** (line 88: `public = true`) with a public read policy (`bike_images_public_read` allows SELECT from `public`).
- **Files:** `supabase/migrations/20260413133749_add_bicycle_admin_management_v2.sql`
- **Impact:** While intended (bike images need to load for unauthenticated users), if any sensitive images are uploaded, they are publicly accessible.
- **Recommendation:** Verify the bucket contains only public-safe content. Consider adding authenticated-only access for admin-only images.

## Technical Debt

### Excessive `as never` and `as unknown as` Casts
**Issue:** Test files and some production code use `as never` and `as unknown as` to bypass TypeScript strict checks extensively:

- `as unknown as ReturnType<typeof useRouter>` — used in 6+ test files
- `as never` for mock return values and session objects — used in `auth.test.ts`, `server.test.ts`, `map-screen.test.tsx`, `active-ride-screen.test.tsx`, etc.
- `as unknown as readonly Coordinates[]` — real casting of JSON data in `ride-history-service.ts` and `users/page.tsx`
- `as BikeRideHistoryEntry["checkpoints"]` and `as BikeRideHistoryEntry["route"]` — unchecked JSON casts in `apps/web/src/app/(admin)/bicycles/[bikeId]/data.ts`

**Impact:** Type safety is bypassed. If the JSON shape changes at runtime, these casts won't catch mismatches.
**Fix approach:** Use runtime validation (zod or valibot) for JSON fields from the database. Introduce type-safe mock factories for tests.

- **Key files:**
  - `apps/mobile/src/features/ride/ride-history-detail-screen.test.tsx:28`
  - `apps/mobile/src/features/map/map-screen.test.tsx:79-83`
  - `apps/mobile/src/lib/ride-history-service.ts:108-109`
  - `apps/web/src/app/(admin)/bicycles/[bikeId]/data.ts:79-89`
  - `apps/web/src/app/(admin)/users/page.tsx:55-56`
  - `apps/web/src/lib/auth.test.ts:89-223`
  - `apps/web/src/lib/supabase/server.test.ts:33-82`

### Mock Data and Production Logic Intertwined
**Issue:** `packages/api/src/index.ts` (638 lines) is a single file containing both service interface definitions AND all mock data (5 bikes, 3 ride histories, wallet, KPI summaries). Services that could be real are stubbed as static mock returns. The `createHttpBikeService` function is the only genuinely configurable transport.
- **Files:** `packages/api/src/index.ts`
- **Impact:** Impossible to have a "real" mode without replacing the entire package.
- **Fix approach:** Split into domain interfaces (`services.ts`), mock data (`mocks/`), and HTTP implementations (`http/`). Remove the default mock export.

### `isTestEnvironment` Checks in Production Code
**Issue:** Four files check `process.env.NODE_ENV === "test"` to skip animations, change behavior, or bypass logic:
- `apps/mobile/src/features/unlock/unlock-screen.tsx:29` — skips animation setup
- `apps/mobile/src/features/ride/active-ride-screen.tsx:22` — skips animations
- `apps/mobile/src/features/wallet/wallet-screen.tsx:36` — skips animations
- `apps/mobile/src/features/ride/live-ride-tracker.ts:303` — skips location watching

- **Files:** Above files
- **Impact:** Production code has test-specific branches. This can mask real issues and leads to tests passing with non-realistic behavior.
- **Fix approach:** Inject animation/testing flags via context or props. Do not use `NODE_ENV` checks.

### Duplicate Supabase Type Definitions
**Issue:** The `Database` type is generated in two separate files:
- `apps/mobile/src/lib/supabase.types.ts` (268 lines)
- `apps/web/src/lib/supabase/database.types.ts` (398 lines — more complete)

These are manually maintained (not auto-generated) and are out of sync — the mobile version has fewer tables/types.
- **Impact:** Schema changes require updating both files manually. Likely drift between the two.
- **Fix approach:** Generate types from Supabase CLI (`supabase gen types typescript`) into `packages/shared` and re-export.

### `console.warn`/`console.error` Without Structured Logging
**Issue:** 14 `console.warn` and `console.error` calls spread across `auth-provider.tsx`, `unlock-screen.tsx`, `active-ride-screen.tsx`, `bike-service.ts`, and `data.ts`. No structured logging library or severity-based logging.
- **Impact:** Production issues are hard to trace. Logs can't be filtered, aggregated, or monitored.
- **Fix approach:** Integrate a lightweight logger (e.g., `pino` or `tslog`) that supports structured output and log levels.

### Wallet Service Uses `as never` for RPC Arguments
**Issue:** `apps/mobile/src/lib/wallet-service.ts:88` passes RPC arguments `as never` when calling `apply_wallet_top_up`.
- **Files:** `apps/mobile/src/lib/wallet-service.ts:88`
- **Impact:** TypeScript won't catch mismatches between the expected RPC arguments and what's passed.
- **Fix approach:** Add typed wrapper for RPC calls or generate typed functions from Supabase.

## Performance Issues

### No Caching Strategy for API Responses
**Issue:** The `packages/api` mock and HTTP services have no caching, deduplication, or stale-while-revalidate pattern. The `createHttpBikeService` makes a fresh fetch on every call. The mobile `createSupabaseBikeService` also queries on every render.
- **Files:** `packages/api/src/index.ts`, `apps/mobile/src/lib/bike-service.ts`
- **Impact:** Unnecessary network requests. Poor offline performance.
- **Fix approach:** Add React Query or SWR for data fetching in the mobile app. Add HTTP caching headers to the API route.

### Ride History Fetches Without Pagination
**Issue:** `getRideHistory()` in both mobile (`ride-history-service.ts`) and web (`users/page.tsx`) fetches ALL ride history records without limit or offset.
- **Impact:** As ride history grows, this will be increasingly slow and memory-intensive.
- **Fix approach:** Add pagination (cursor or offset-based) with a reasonable default limit.

### Auth Bootstrap Has a 5-Second Timeout Race
**Issue:** `apps/mobile/src/features/auth/auth-provider.tsx:234-246` uses `Promise.race` with a 5-second timeout. If the auth bootstrap takes longer, the user gets an error unnecessarily.
- **Impact:** Users with slow connections may be kicked out.
- **Fix approach:** Use a longer timeout or make it configurable. Consider showing a loading state instead of erroring.

### `useNativeDriver: false` in Animations
**Issue:** The `MethodVisual` component in `unlock-screen.tsx` uses `useNativeDriver: false` for animated pulse effects.
- **Files:** `apps/mobile/src/features/unlock/unlock-screen.tsx:209`
- **Impact:** Animations run on the JS thread, causing jank during heavy operations.
- **Fix approach:** Change to `useNativeDriver: true` (the animated properties used — opacity and scale — support native driver).

## Gaps & Risks

### No E2E Tests for Mobile App
**Issue:** The mobile app has unit tests but no E2E or integration tests. The web app has Playwright E2E tests configured (`test:e2e` script) but actual test files need verification.
- **Impact:** Critical user flows (unlock → ride → complete) are not tested end-to-end on either platform.
- **Recommendation:** Add E2E test coverage for the core unlock → ride flow using Detox (mobile) and Playwright (web).

### Missing Environment Variable Validation at Build Time
**Issue:** Environment variables like `EXPO_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` are checked at runtime with `.trim()` and fallback logic. There is no build-time validation that required vars are present.
- **Files:** `apps/web/src/lib/supabase/config.ts`, `apps/web/src/lib/supabase/admin.ts`, `apps/mobile/src/lib/supabase.ts`
- **Impact:** Missing config is only discovered at runtime, potentially in production.
- **Fix approach:** Add a build-time validation step that throws if required env vars are missing.

### No Error Boundaries in Mobile App
**Issue:** The mobile app does not use React Error Boundaries. A crash in any component will cause a white screen or crash the app.
- **Files:** `apps/mobile/src/features/*` (all screens)
- **Impact:** Poor UX — no graceful error recovery.
- **Fix approach:** Add a global Error Boundary at the root layout level.

### No Offline Support Strategy
**Issue:** Neither the mobile nor web app has offline support (no service worker, no cache persistence, no optimistic UI).
- **Files:** `apps/mobile/src/lib/*` (all services)
- **Impact:** The app is completely unusable without network connectivity.
- **Fix approach:** Implement an offline-first strategy using React Query with persisted cache, or use a library like `@tanstack/query-persist-client-core`.

### Missing Tests for Several Services
**Issue:** The following modules lack test coverage:
- `apps/mobile/src/lib/unlock-service.ts` — no tests
- `apps/mobile/src/features/ride/live-ride-tracker.ts` — partial tests (live-ride-tracker.test.ts exists but is thin)
- `apps/mobile/src/features/eco-impact/*` — no tests
- `apps/mobile/src/features/bike/bike-details-screen.tsx` — no tests
- `apps/web/src/components/operations-dashboard.tsx` — no tests
- `apps/web/src/components/executive-scorecard.tsx` — no tests

- **Impact:** Untested code is more likely to break during refactoring.
- **Recommendation:** Add unit test coverage for untested modules, prioritizing unlock flow and dashboard components.

## Outdated Dependencies

### Floating Test Library Versions
**Issue:** `apps/web/package.json` uses `"latest"` for `@testing-library/jest-dom`, `@testing-library/react`, and `jest-environment-jsdom`.
- **Impact:** Builds can break unexpectedly when these packages release breaking changes.
- **Fix approach:** Pin to specific versions.

### `react-native-url-polyfill` Likely Unnecessary
**Issue:** `apps/mobile/package.json` includes `react-native-url-polyfill: ^3.0.0`. Modern React Native (0.81+) has native URL support. The Supabase JS client v3 also handles URL parsing natively.
- **Files:** `apps/mobile/package.json:49`
- **Impact:** Unnecessary dependency adding bundle size.
- **Fix approach:** Verify it's no longer needed and remove.

### No Version Locks for Workspace Dependencies
**Issue:** `@glide/api: "workspace:*"` and `@glide/shared: "workspace:*"` in both apps — while this is correct for monorepo development, there's no explicit semver contract between packages.
- **Impact:** A breaking change in `packages/shared` can immediately break consuming apps without warning.
- **Fix approach:** Use `workspace:^` to enforce semver constraints between packages.

## Code Quality Issues

### Large Screen Components
**Issue:** Several components are too large:
- `unlock-screen.tsx` — 998 lines
- `wallet-screen.tsx` — 1,450+ lines
- `user-management-table.tsx` — 683 lines

- **Impact:** Hard to read, test, and maintain. Violates single-responsibility principle.
- **Fix approach:** Extract reusable sub-components, custom hooks, and helper functions.

### Duplicate RPC Argument Definitions
**Issue:** `apps/web/src/lib/supabase/database.types.ts` and `apps/mobile/src/lib/supabase.types.ts` both define `complete_ride` and `apply_wallet_top_up` function interfaces, but they're maintained separately.
- **Impact:** Schema changes require updating both files. Likely drift.
- **Fix approach:** Generate Supabase types centrally and export from `packages/shared`.

### No Barrel File Organization Beyond Index.ts
**Issue:** The `apps/mobile/src/features/` directories and `apps/web/src/components/` directories lack barrel (`index.ts`) files. All imports use direct file paths (e.g., `@/features/auth/auth-provider`).
- **Impact:** Refactoring file locations breaks imports. No clean public API per feature.
- **Fix approach:** Add `index.ts` barrel files for each feature that export the public components/hooks.

### Unnecessary `selectable` Prop on Every Text Component
**Issue:** Throughout the mobile app, every `<Text selectable>...</Text>` includes the `selectable` prop. This is likely a copy-paste pattern.
- **Files:** All screen and component files in `apps/mobile/src/`
- **Impact:** Unnecessary visual clutter — users can select text everywhere unnecessarily.
- **Fix approach:** Remove `selectable` from non-critical text elements.

### No Shared Error Types Between Apps
**Issue:** The `normalizeError` function in `auth-provider.tsx` (line 60-66) is a local utility. Error handling patterns differ between mobile and web.
- **Impact:** Inconsistent error messages and handling behavior across platforms.
- **Fix approach:** Define shared error handling utilities in `packages/shared`.

### Inline Styles Throughout Mobile App
**Issue:** All mobile components use inline `style={{...}}` objects. No StyleSheet.create() or external style abstraction is used beyond the `theme/tokens.ts` values.
- **Files:** All `.tsx` files in `apps/mobile/src/`
- **Impact:** Each render creates new style object references, causing unnecessary re-renders. Poor performance for list components.
- **Fix approach:** Use `StyleSheet.create()` for static styles or extract common patterns.

---

*Concerns audit: 2026-06-27*
