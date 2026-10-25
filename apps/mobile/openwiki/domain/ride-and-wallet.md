# Ride and wallet domain rules

## Bike status model

The generated Supabase type `src/lib/supabase.types.ts` defines `bike_status` values as:

- `available`
- `reserved`
- `in_use`
- `maintenance`

Mobile code consumes bike status in map markers, bike drawers, unlock gating, local ride overrides, and bike status sync. `src/features/map/marker-colors.ts` gives selected bikes coral, available bikes teal, the current rider's active bike yellow, and unavailable/other active bikes danger styling.

Bike reads and bike status writes are separate domains:

- Reads come from `configuredBikeService` and can use Supabase, HTTP API, or mock data.
- Writes use `configuredBikeStatusService` and require an HTTP API endpoint plus bearer token.

## Nearby-bike business rules

`src/features/map/map-screen.tsx` and `src/lib/bike-service.ts` define the customer discovery experience:

- Primary radius: 1500 m.
- Expanded radius: 8000 m if no bikes are found nearby.
- Poll interval: 15 seconds while focused.
- Location fallback: current position → last known position → Bangkok default.
- Supabase bike rows are fetched ordered by `last_reported_at`, mapped to shared `Bike`, then filtered client-side by Haversine radius.
- Recoverable bike read network failures can fall back to mock bikes.

Unlock is allowed only for `available` bikes. The UI explains disabled actions for maintenance, reservation, or active use by another rider.

## Active ride tracking

`src/features/ride/live-ride-tracker.ts` is the canonical place for live ride metrics:

- Minimum route-point movement: 0.015 km.
- Mock tick interval: 5000 ms.
- Default rate: 0.17 per minute.
- CO₂ savings: 0.24 kg per km.
- Native location interval: 12 meters or 5000 ms.
- Drop-off states: `arrived` at <= 0.05 km, `approaching` at <= 0.25 km, otherwise `en_route`.

Drop-off zones are currently fixed Bangkok locations:

1. Benjakitti Park
2. Lumphini Park West Gate
3. Silom Complex

`createLiveRideSnapshot` builds the ride record candidate with duration, distance, current cost, CO₂, route label, start/end location, full route, and two checkpoints: Unlock and Drop-off.

## Completing rides

`src/features/ride/active-ride-screen.tsx` coordinates end-ride logic. With Supabase enabled, completion is not just navigation:

1. `configuredRideHistoryService.completeRide` calls Supabase RPC `complete_ride` with bike id, distance, end location, route label, route, checkpoints, and CO₂.
2. The app then syncs bike status back to `available` through the HTTP bike status API.
3. Failure to sync status stores `pending_release_<bikeId>` in AsyncStorage and keeps the user on the active ride screen with an error.
4. Success clears the persisted active ride session and local bike override.

`src/lib/ride-history-service.ts` reads completed rides from `rental_transactions` filtered by current `profile_id`. It also fetches bike model names from `bikes` for display. The service casts JSON `route` and `checkpoints` fields to shared types, so database shape and UI assumptions must stay aligned.

## Wallet and transactions

`src/lib/wallet-service.ts` maps Supabase wallet rows and transactions into shared `Wallet` objects:

- Wallet row id is expected to match the authenticated user id.
- Transactions are read from `wallet_transactions` by `wallet_id`, newest first.
- Missing session or missing wallet row is an error.
- Top-up calls RPC `apply_wallet_top_up(p_amount, p_title, p_subtitle)`.

`src/features/wallet/wallet-screen.tsx` defines user-facing payment methods and top-up state. Visible payment methods are PromptPay, Mobile Banking, TrueMoney, and Gift Voucher. Card support exists in local types/visuals but is not part of the rendered method list described by tests.

## Rewards and eco impact

Reward milestones are defined in `src/lib/reward-milestones.ts` and surfaced as badges in `src/features/eco-impact/badge-definitions.ts`:

- `signup` / Welcome Rider
- `first_wallet_top_up`
- `first_ride`
- `five_rides`
- `ten_rides`

`src/features/eco-impact/eco-stats-utils.ts` computes lifetime ride stats and equivalents:

- Total rides, distance, CO₂ saved, and duration are sums over ride history.
- Tree equivalent is CO₂ kg divided by 22.
- Car trips avoided is CO₂ kg divided by 2.3.
- Streaks use Bangkok dates (`Asia/Bangkok`) and count consecutive completion dates only when the latest ride is today or yesterday.

Milestone celebrations are opportunistic: wallet and active ride flows inspect recent wallet transactions to show newly earned achievements, but the source of truth for badges is computed from ride count and top-up transaction history.

## Domain change watchouts

- Changing fare or billable-minute behavior may require updates in shared package logic as well as mobile tests.
- Changing ride completion inputs must stay compatible with the `complete_ride` RPC and `rental_transactions` generated types.
- Changing wallet transaction types must stay compatible with shared transaction presentation helpers and wallet tests.
- Adding real lock hardware should replace or wrap `configuredUnlockService` while preserving status sync and active-ride handoff expectations.
- Adding new drop-off zones should update tracker tests and any UI copy that assumes the current fixed set.
