# Integrations

**Analysis Date:** 2026-06-27

## External Services

### Supabase (Primary Backend)

Supabase serves as the entire backend — database, authentication, and API gateway.

**SDK versions:**
- `@supabase/supabase-js` ^2.103.0 — used in both apps
- `@supabase/ssr` ^0.10.2 — Next.js server-side rendering auth (web only)

**Endpoints (from `.env.example`):**
- Web: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Mobile: `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Web admin service role: `SUPABASE_SERVICE_ROLE_KEY`

**Auth integration:**
- **Web (`apps/web/src/lib/supabase/`)** — Three client patterns:
  - `server.ts` — `createServerClient()` with Next.js cookie store for RSC/Server Actions
  - `client.ts` — `createBrowserClient()` for client components ("use client")
  - `admin.ts` — `createClient()` with service role key for admin operations (user creation)
  - `proxy.ts` — Session refresh in middleware (`apps/web/proxy.ts`)
  - Auth flow: Email/password → `signInWithPassword` → session cookies → `getUser()` → profile check (`is_admin`) → redirect
- **Mobile (`apps/mobile/src/lib/supabase.ts`)** — Single client instance
  - Storage: `AsyncStorage` (native) / `localStorage` (web)
  - Auto-refresh tokens with `AppState` listeners
  - Deep link handling via `expo-linking` for redirect-based auth

**Database integration (direct queries):**
- Both apps query Supabase directly from frontend code (no dedicated BFF)
- Web uses Row-Level Security (RLS) enforced through Supabase policies
- Web uses `createAdminClient()` (service role) for privileged operations
- Mobile uses anon key with RLS policies

**Database schema** (`supabase/migrations/`):

| Table | Purpose | Key Columns |
|---|---|---|
| `profiles` | User profiles | `id` (FK to auth.users), `first_name`, `is_admin` |
| `bikes` | Bike inventory | `id`, `status`, `latitude`, `longitude`, `rate_per_minute` |
| `wallets` | Rider wallets | `balance`, `points`, `payment_methods` |
| `wallet_transactions` | Transaction log | `wallet_id`, `type` (ride/top_up/reward), `amount` |
| `bike_ride_history` | Completed rides | route (JSON), checkpoints (JSON), costs |

**Database functions:** `apply_wallet_top_up`, `complete_ride` — both defined in migrations.

**Seed data** (`supabase/seed.sql`): 1 admin user + 3 rider users, 6 bikes, ride history records, wallet transactions.

### Wikimedia Commons (External Image CDN)

**Usage:** Seed bike images hosted on Wikimedia Commons.
- URL pattern: `https://commons.wikimedia.org/wiki/Special:FilePath/{filename}?width=1200`
- Referenced in `packages/api/src/index.ts` (`seedBikeImageUrls`)
- Configured as allowed remote pattern in `apps/web/next.config.ts`

### Mapping Services

| Platform | Tech | Usage | File |
|---|---|---|---|
| Mobile | `react-native-maps` ^1.20.1 | Native map canvas with markers | `apps/mobile/src/features/map/map-canvas.native.tsx` |
| Web | Leaflet ^1.9.4 | Ride route map, admin map views | `apps/web/src/app/globals.css` imports `leaflet/dist/leaflet.css` |

No API keys for maps detected — mobile uses built-in native maps (no Google Maps API key visible), Leaflet uses OpenStreetMap tiles (no paid tile service detected).

## API Boundaries

### Internal Service Contracts (`packages/api`)

Typed service interfaces that both apps depend on:

| Interface | Methods | Consumer |
|---|---|---|
| `BikeService` | `listNearby()`, `getById()` | Mobile map, Admin dashboard |
| `RideService` | `getActiveRide()`, `getRideSummary()` | Mobile ride screen |
| `UnlockService` | `startUnlock()` | Mobile unlock flow |
| `WalletService` | `getWallet()` | Mobile wallet screen |
| `SupportService` | `startSession()` | Mobile support chat |
| `AuthService` | `getCurrentUser()`, `signIn()` | Admin login |

Each interface has a **mock implementation** in `packages/api/src/index.ts` returning hardcoded data with Bangkok/THB context.

### HTTP Service Layer (`packages/api`)

`createHttpBikeService()` — factory that creates a `BikeService` backed by HTTP calls:
- `GET {baseUrl}/bikes/nearby?lat=&lng=&radius=&limit=`
- `GET {baseUrl}/bikes/{bikeId}`
- Uses a pluggable `fetchImpl` parameter (defaults to `globalThis.fetch`)

### Web API Routes (`apps/web/src/app/api`)

| Route | Method | Purpose | Auth |
|---|---|---|---|
| `/api/bikes/[bikeId]/status` | PATCH | Update bike status (start/end ride, reserve, maintenance) | Bearer token → Supabase Auth |

This route is used by the mobile app's `BikeStatusService` (`apps/mobile/src/lib/bike-status-service.ts`) for real-time status changes. It validates auth via `supabase.auth.getUser()` and uses optimistic concurrency (checks current status before update).

### Mobile Data Source Selection (`apps/mobile/src/lib/bike-service.ts`)

The mobile app supports a configurable data source chain via env vars:

1. `EXPO_PUBLIC_BIKE_DATA_SOURCE=mock` → use `@glide/api` mock service
2. `EXPO_PUBLIC_BIKE_DATA_SOURCE=api` + `EXPO_PUBLIC_API_BASE_URL` → HTTP-backed service
3. (default) `hasSupabaseConfig` → `createSupabaseBikeService()` (direct Supabase queries)
4. Fallback `apiBaseUrl` → HTTP service
5. Ultimate fallback → mock service

When using HTTP/API mode, the service wraps calls in a **resilience layer** that falls back to mock data on network errors (timeout, fetch failure).

## Data Flow

### Primary Ride Flow

```
[Mobile App]                                 [Supabase]              [Web API]
    |                                            |                       |
    |-- 1. User opens map ---------------------->|                       |
    |    (supabase.from("bikes").select())        |                       |
    |<-- bike list with status/location ----------|                       |
    |                                            |                       |
    |-- 2. User taps bike, unlocks via QR/BT ---->|                       |
    |    (unlock flow - mock only currently)      |                       |
    |                                            |                       |
    |-- 3. PATCH /api/bikes/[id]/status --------->|                       |--> Supabase
    |    (Bearer token + status="in_use")         |                       |    (update bike)
    |<-- 200 OK ----------------------------------|                       |
    |                                            |                       |
    |-- 4. Ride active, periodic polling -------->|                       |
    |    (ride data)                              |                       |
    |                                            |                       |
    |-- 5. PATCH /api/bikes/[id]/status --------->|                       |--> Supabase
    |    (Bearer token + status="available")      |                       |    (end ride)
    |<-- 200 OK + completion data ----------------|                       |
```

### Admin Flow

```
[Web Admin Panel]                              [Supabase]
    |                                              |
    |-- Login (email/password) ------------------->|
    |    (supabase.auth.signInWithPassword)         |
    |<-- session cookie set -----------------------|
    |                                              |
    |-- requireAdmin() ---------------------------->|
    |    (supabase.from("profiles").select(is_admin)|
    |<-- admin context or redirect /login ----------|
    |                                              |
    |-- Dashboard -------------------------------->|
    |    (mock data from @glide/api currently)      |
    |                                              |
    |-- User management (CRUD) ------------------->|
    |    (admin.createUser, profiles.update)        |
    |                                              |
    |-- Bike management -------------------------->|
    |    (bikes.update, bikes.select)               |
```

## Third-Party Dependencies

### Critical Dependencies (Directly affect functionality)

| Package | Workspace | Why it matters |
|---|---|---|
| `@supabase/supabase-js` | mobile, web | All database and auth operations |
| `@supabase/ssr` | web | Server-side auth session management |
| `react-native-maps` | mobile | Native map rendering for bike location |
| `expo-router` | mobile | All mobile routing and navigation structure |
| `leaflet` | web | Web map rendering for ride routes |
| `recharts` | web | Admin dashboard KPI charts |
| `next` | web | Core web framework, all pages and API routes |
| `expo` | mobile | Core mobile framework |
| `react-native-reanimated` | mobile | Animations throughout mobile UI |
| `@react-native-async-storage/async-storage` | mobile | Supabase session persistence |

### Development Dependencies

| Package | Workspace | Purpose |
|---|---|---|
| `@playwright/test` | web | E2E and integration testing |
| `@testing-library/react-native` | mobile | Component unit tests |
| `jest-expo` | mobile | Jest config for Expo |
| `@tailwindcss/postcss` | web | Tailwind CSS v4 PostCSS plugin |
| `typescript-eslint` | root | TypeScript ESLint rules |

## Configuration

### Required Environment Variables

**Web (`apps/web/.env.example`):**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/publishable key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (admin user management)

**Mobile (`apps/mobile/.env.example`):**
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/publishable key
- `EXPO_PUBLIC_API_BASE_URL` — Web app API base URL (for status updates)
- `EXPO_PUBLIC_BIKE_DATA_SOURCE` — Data source selector (`supabase`, `api`, or `mock`)

---

*Integration audit: 2026-06-27*
