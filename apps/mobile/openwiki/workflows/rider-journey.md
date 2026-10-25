# Rider journey workflows

## 1. Authentication and onboarding

Routes under `app/(auth)/` render welcome, login, signup, and callback screens. `AuthProvider` (`src/features/auth/auth-provider.tsx`) is the source of truth for auth state and profile state.

Core behavior:

- Login validates email/password in `login-screen.tsx` and delegates to `signIn`.
- Signup validates first name/email/password in `signup-screen.tsx`, sends `first_name` metadata, and may enter `awaiting_email_confirmation`.
- Native auth links can restore access and refresh tokens through the `callback` deep link path.
- A profile row is expected after auth. If it cannot be found after retries, the provider signs out to avoid an authenticated session without rider profile data.

Relevant tests: `src/features/auth/auth-provider.test.tsx`, `login-screen.test.tsx`, `signup-screen.test.tsx`, `auth-gate.test.tsx`.

## 2. Finding a bike

The map tab route renders `src/features/map/map-screen.tsx`.

Workflow:

1. Request foreground location permission.
2. Read current position with balanced accuracy.
3. Fall back to last known position, then Bangkok default coordinates (`13.7563, 100.5018`).
4. Query nearby bikes within 1500 m; if none are found, expand to 8000 m and show a wider-area notice.
5. Poll every 15 seconds while the screen is focused and refresh when the app returns active.
6. Sort bikes by Haversine distance and merge local ride overrides so a just-unlocked bike appears in use immediately.

Marker behavior routes the current rider's in-use bike to `/ride/active`; other bikes open `BikeMarkerDrawer`. The drawer only allows unlock for `available` bikes and explains why `maintenance`, `reserved`, or another rider's `in_use` bike cannot be unlocked.

Relevant files: `src/features/map/map-screen.tsx`, `bike-marker-drawer.tsx`, `bike-distance.ts`, `marker-colors.ts`, `src/lib/bike-service.ts`, `src/features/bike/bike-details-screen.tsx`.

## 3. Unlocking a bike

`app/unlock/[id].tsx` renders `src/features/unlock/unlock-screen.tsx`. The current implementation is a simulated Expo Go flow, not a physical lock SDK integration.

User flow:

1. Choose QR or Bluetooth.
2. Generate a QR pass or simulate Bluetooth connection.
3. Confirm the unlock command from a modal.
4. Animate unlock phases from `configuredUnlockService`.
5. On success, try to sync bike status to `in_use` through `configuredBikeStatusService` using the Supabase access token.
6. Set a local ride override via `RideSessionProvider`.
7. Redirect to `/ride/active?bikeId=...&entry=unlock`.

Important behavior: missing token or status sync failure stops the success path in a reconciling state. The local ride override is only set and the user is only redirected to the active ride after the bike status sync succeeds. Tests in `src/features/unlock/unlock-screen.test.tsx` ensure there is no direct success shortcut and that QR/Bluetooth flows require explicit confirmation.

## 4. Active ride and end ride

`app/ride/active.tsx` renders `src/features/ride/active-ride-screen.tsx`.

Active ride can hydrate from a `bikeId` route param or from persisted AsyncStorage state managed by `src/features/ride/active-ride-session.ts`. While mounted, it saves ride session state with bike snapshot and route points.

`src/features/ride/live-ride-tracker.ts` handles live tracking:

- Native GPS tracking uses Expo Location when permission is available.
- Web/test/permission-denied/error scenarios can use deterministic mock route progression.
- Route points less than 0.015 km from the previous point are ignored.
- Fare estimates use the bike rate per minute, defaulting to 0.17.
- CO₂ saved is `distanceKm * 0.24`, rounded to one decimal.
- Drop-off guidance targets the nearest of Benjakitti Park, Lumphini Park West Gate, or Silom Complex.

Ending a ride with Supabase configured is intentionally strict:

1. Call `configuredRideHistoryService.completeRide`, which uses the `complete_ride` RPC.
2. Require a session access token.
3. Sync bike status back to `available` through the HTTP bike status API.
4. If token or status sync fails, store `pending_release_<bikeId>` in AsyncStorage and do not navigate to summary.
5. On success, clear local ride session and ride override, then route to `/ride/summary?id=<rideId>` with an optional milestone.

On later mounts, active ride attempts to reconcile pending release syncs if an access token is available.

## 5. Ride summary and history

`src/features/ride/ride-summary-screen.tsx` loads a completed ride by id when Supabase is configured; without Supabase it uses mock summary data. `src/features/ride/ride-history-detail-screen.tsx` loads a single ride constrained to the current profile in `configuredRideHistoryService`.

The profile screen (`src/features/profile/profile-screen.tsx`) lists ride history on focus and opens the detail route for a selected ride.

## 6. Wallet top-up

The wallet tab renders `src/features/wallet/wallet-screen.tsx`. The service layer is `src/lib/wallet-service.ts`.

Supported visible top-up paths:

- PromptPay
- Mobile Banking with KBank, SCB, BBL, KTB, TTB, or BAY
- TrueMoney
- Gift Voucher

Top-up amounts are ฿5, ฿10, ฿20, and ฿50. PromptPay generates a mock payload shaped like `PROMPTPAY|{amount}|{10-digit-ref}`. TrueMoney generates a mock 10-digit mobile number with prefix `06`, `08`, or `09`. Voucher confirmation requires a code length of at least six characters.

With Supabase configured, top-up calls the `apply_wallet_top_up` RPC and reloads wallet state. Without Supabase, the mock path returns a locally adjusted wallet object.

## 7. Eco, profile, and support

`src/features/eco-impact/eco-impact-screen.tsx` combines ride history and wallet data to show lifetime rides, distance, CO₂, ride time, loyalty points, streak, and achievement badges.

`src/features/profile/profile-screen.tsx` shows profile name/email, editable display name, ride history, and shortcuts to support/wallet/sign-out.

Support is scaffolded in `src/features/support/help-screen.tsx` and `chat-support-screen.tsx`; the current UI positions support as chatbot-first with future live-agent escalation but no real support SDK integration is present.
