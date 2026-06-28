<!-- refreshed: 2026-06-27 -->
# Architecture

**Analysis Date:** 2026-06-27

## System Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                    Client Applications                           │
├─────────────────────────────┬───────────────────────────────────┤
│     @glide/mobile            │       @glide/web                  │
│  (Expo Router / RN 0.81)    │   (Next.js 16 / App Router)       │
│  apps/mobile/                │   apps/web/                       │
│                              │                                   │
│  ┌─ app/ (routes)          │   ┌─ src/app/ (routes)             │
│  ├─ src/features/          │   ├─ src/components/               │
│  ├─ src/components/        │   ├─ src/lib/                      │
│  ├─ src/lib/               │   │  └─ supabase/                  │
│  └─ src/theme/             │   └─ tests/                        │
└──────────┬──────────────────┴───────────┬───────────────────────┘
           │                               │
           │       @glide/api              │
           │   (Service interfaces, mock   │
           │    implementations, HTTP       │
           │    client factory)             │
           │   packages/api/src/index.ts    │
           │                               │
           │       @glide/shared            │
           │   (Domain types, utilities,    │
           │    fare calc, formatters)       │
           │   packages/shared/src/         │
           │                               │
           ▼                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Supabase / Postgres                         │
│                                                                  │
│  Tables: profiles, bikes, bike_ride_history, wallets,            │
│          wallet_transactions                                      │
│  Functions: apply_wallet_top_up, complete_ride                    │
│  supabase/migrations/  (13 migration files)                      │
└──────────────────────────────────────────────────────────────────┘
```

## Module Boundaries

| Module | Location | Responsibility |
|--------|----------|----------------|
| `@glide/shared` | `packages/shared/src/` | Domain types (`Bike`, `Ride`, `Wallet`, `User`, etc.), fare calculation (`calculateRideRevenue`, `calculateBillableMinutes`), formatting (`formatCurrency`, `formatDistanceKm`, `formatDuration`) |
| `@glide/api` | `packages/api/src/` | Service interfaces (`AuthService`, `BikeService`, `RideService`, `UnlockService`, `WalletService`, `SupportService`), mock data, `createHttpBikeService` factory |
| `@glide/mobile` | `apps/mobile/` | Customer-facing e-bike rental app with map, unlock, ride tracking, wallet, eco impact, support |
| `@glide/web` | `apps/web/` | Admin operations panel for fleet management, user management, executive dashboard |

**Dependency direction:** `@glide/shared` ← `@glide/api` ← `@glide/mobile`, `@glide/web`

No circular dependencies between workspaces. Each app imports from `@glide/api` and `@glide/shared`.

## Data Flow

### Mobile App — Bike Listing Flow

1. **Entry:** `app/(tabs)/index.tsx` → renders `MapScreen` (`src/features/map/map-screen.tsx`)
2. **Service resolution:** `src/lib/bike-service.ts` → selects data source based on `EXPO_PUBLIC_BIKE_DATA_SOURCE` env var:
   - `"mock"` → `@glide/api` mock `bikeService`
   - `"api"` → `createHttpBikeService(baseUrl)` calling an external API
   - Supabase (default) → `createSupabaseBikeService()` queries `bikes` table
   - Network errors → automatically falls back to mock via `createResilientBikeService`
3. **Rendering:** `MapCanvas` displays markers, `BikeMarkerDrawer` shows selected bike details
4. **Polling:** Every 15 seconds (`MAP_POLL_INTERVAL_MS`)

### Mobile App — Auth Flow

1. `app/_layout.tsx` → wraps app in `AuthProvider` + `RideSessionProvider`
2. `AuthProvider` (`src/features/auth/auth-provider.tsx`):
   - Bootstraps session from Supabase on mount (with 5s timeout)
   - Uses `expo-linking` for deep-link auth redirects on native
   - Retries profile fetch up to 8 times (250ms apart) with `waitForProfile`
   - Subscribes to `supabase.auth.onAuthStateChange` for real-time session changes
3. `AuthGate` (`src/features/auth/auth-gate.tsx`) → protects route groups
4. Supabase client uses `AsyncStorage` on native, `localStorage` on web; auto-refresh via `AppState`

### Web App — Admin Data Flow

1. **Data fetching:** Server Components query Supabase directly via `createClient()` from `@supabase/ssr`
2. **Mutations:** Server Actions (`"use server"`) in route-level `actions.ts` files:
   - `apps/web/src/app/(admin)/actions.ts` — createUser, updateUser, signOut
   - `apps/web/src/app/(admin)/bicycles/actions.ts` — createBike, updateBike, deleteBike
   - `apps/web/src/app/login/actions.ts` — signIn
3. **Auth guard:** `requireAdmin()` in `src/lib/auth.ts` redirects to `/login` if no valid admin session
4. **Form state:** Pattern of `initialXxxFormState` + `useActionState` for progressive enhancement

### Web App — Bike Detail with Parallel Route

1. `app/(admin)/bicycles/layout.tsx` accepts `children` + `drawer` route slots
2. `@drawer/(.)[bikeId]/` is an **intercepting route** — opens bike detail in a side drawer
3. Direct navigation to `/bicycles/[bikeId]` renders full page instead
4. Consumes `SideDrawer` component for the overlay panel

## Design Patterns

### Service Interface Pattern

All service boundaries are defined as TypeScript interfaces in `packages/api/src/index.ts`:

```typescript
export interface BikeService {
  listNearby(query: NearbyBikesQuery): Promise<NearbyBikesResult>;
  getById(id: string): Promise<Bike | undefined>;
}
```

Each interface has:
- **Mock implementation** in `@glide/api` with hardcoded seed data (e.g., `bikeService`, `walletService`)
- **Supabase implementation** in the mobile `src/lib/` layer (e.g., `createSupabaseBikeService()`)
- **HTTP client implementation** optionally via `createHttpBikeService()` factory
- **Resilience wrapper** in mobile that falls back to mock on network errors

### Context Provider Pattern (Mobile)

Two top-level React Contexts in `app/_layout.tsx`:

```
GestureHandlerRootView
  └── AuthProvider         (auth state, session, profile CRUD)
       └── RideSessionProvider  (bike ride state overrides)
            └── Stack Navigator (Expo Router)
```

- `AuthProvider` — manages `authStatus`, `session`, `user`, `profile`, `authError`
- `RideSessionProvider` — lightweight store for `bikeRideOverrides` (status/activeRiderId per bike)

### Server Action Form State Pattern (Web)

Forms use a state object with `message` + `status` + `errors` fields:

```typescript
interface UserCreateFormState {
  message: string;
  status: "idle" | "success" | "error";
}
```

Initial state exported from `*-form-state.ts` files, used by `useActionState` in client components.

### Resilience / Fallback Pattern

Mobile services layer (`src/lib/bike-service.ts`, `src/lib/ride-history-service.ts`, `src/lib/wallet-service.ts`) implements a fallback chain:

1. Check `EXPO_PUBLIC_BIKE_DATA_SOURCE` env var for preferred source
2. If Supabase is configured, use it
3. If HTTP API base URL is available, use it
4. Default to `@glide/api` mock services
5. On network errors (`network request failed`, `fetch failed`, `timed out`), fall back to mocks

## State Management

**Mobile (`@glide/mobile`):**
- **React Context** for cross-cutting concerns: `AuthProvider`, `RideSessionProvider`
- **Local component state** (`useState`) for screen-level data (map selection, UI state)
- **URL-based navigation state** via Expo Router (route params for bike ID, ride ID)
- **No external state management library** (no Redux, Zustand, Jotai)

**Web (`@glide/web`):**
- **Server Components** for read-only data (none to minimal client JS)
- **Server Actions** for mutations with `revalidatePath` for cache invalidation
- **`useActionState`** for form submission lifecycle
- **Client state** (`useState`) for UI features like tab switching in `AdminShell`
- **No external state management** — relies on Next.js App Router caching model

## Routing & Navigation

### Mobile (Expo Router — File-based)

```
app/
├── _layout.tsx           # Root layout: AuthProvider + RideSessionProvider + Stack
├── index.tsx             # Landing/Splash redirect
├── (auth)/
│   ├── _layout.tsx       # Auth group layout (stack)
│   ├── welcome.tsx       # Welcome/onboarding
│   ├── login.tsx         # Login screen
│   ├── signup.tsx        # Sign up screen
│   └── callback.tsx      # Auth callback handler
├── (tabs)/
│   ├── _layout.tsx       # Bottom tab navigator (Map, Wallet, Scan, Eco, Profile)
│   ├── index.tsx         # Map screen
│   ├── wallet.tsx        # Wallet screen
│   ├── scan.tsx          # QR scan (prevented, redirects to unlock)
│   ├── eco.tsx           # Eco impact dashboard
│   └── profile.tsx       # User profile screen
├── bike/[id].tsx         # Bike detail screen
├── unlock/[id].tsx       # Unlock flow screen
├── ride/
│   ├── active.tsx        # Active ride screen
│   ├── summary.tsx       # Post-ride summary
│   └── history/[id].tsx  # Ride history detail (modal presentation)
└── help/
    └── index.tsx         # Support/help screen
```

### Web (Next.js App Router — File-based)

```
src/app/
├── layout.tsx                # Root layout: fonts (Manrope + Space Grotesk), globals CSS
├── globals.css               # Tailwind imports + clay design system
├── favicon.ico
├── login/
│   ├── page.tsx              # Login page with hero scene (three.js)
│   ├── login-form.tsx        # Client component login form
│   ├── login-hero-scene.tsx  # Three.js animated scene
│   └── actions.ts            # signIn server action
└── (admin)/
    ├── layout.tsx            # Admin shell: GlideBrand + AdminNav + signOut
    ├── page.tsx              # Home nav cards (Dashboard, Users, Bicycles)
    ├── actions.ts            # createUser, updateUser, signOut server actions
    ├── dashboard/
    │   ├── page.tsx          # Wrapper → AdminShell (tabs: Executive/Operations)
    │   └── loading.tsx
    ├── users/
    │   └── page.tsx          # User management table (server component)
    └── bicycles/
        ├── layout.tsx        # Parallel route layout (children + @drawer)
        ├── page.tsx          # Fleet management list
        ├── actions.ts        # createBike, updateBike, deleteBike
        ├── loading.tsx
        ├── [bikeId]/
        │   ├── page.tsx      # Bike detail (full page)
        │   └── data.ts       # Bike detail data fetching
        ├── new/
        │   └── page.tsx      # Create bike form
        └── @drawer/
            ├── default.tsx   # Empty drawer fallback
            └── (.)[bikeId]/
                └── page.tsx  # Intercepted bike detail in drawer
```

### API Routes (Web)

```
src/app/api/
└── bikes/
    └── [bikeId]/
        └── route.ts          # GET /api/bikes/[bikeId] — REST endpoint for bike fetch
```

## Key Abstractions

**`AuthProvider` / `useAuth`** (`apps/mobile/src/features/auth/auth-provider.tsx`):
- Manages Supabase auth lifecycle, session restore with timeout, profile reconciliation, deep-link handling
- Exposes `authStatus: "loading" | "authenticated" | "unauthenticated" | "awaiting_email_confirmation"`

**`configuredBikeService`** (`apps/mobile/src/lib/bike-service.ts`):
- Resolves the active bike data source at module load time
- Wraps primary service with `createResilientBikeService` for automatic mock fallback

**`requireAdmin()`** (`apps/web/src/lib/auth.ts`):
- Guards admin routes by verifying Supabase auth session + `profiles.is_admin` flag
- Returns `AdminContext` with user + profile, or redirects to `/login`

**Server Actions** (multiple `apps/web/src/app/*/actions.ts`):
- Next.js `"use server"` functions for create/update/delete operations
- Pattern: validate with `src/lib/validation.ts` → mutate Supabase → `revalidatePath` → return form state or redirect

**Theme tokens** (`apps/mobile/src/theme/tokens.ts`):
- Centralized design constants: colors, spacing, radii, border widths, font families, typography presets, shadows
- Used throughout mobile app components via named imports (`colors.coralDark`, `spacing.lg`)

## Cross-Cutting Concerns

**Logging:** `console.warn` used in mobile for non-critical failures (auth fallback, profile fetch issues). No structured logging framework.

**Validation:** `apps/web/src/lib/validation.ts` — pure functions for form validation (`validateLoginForm`, `validateUserCreateForm`, `validateProfileUpdateForm`, `validateBikeForm`). Used exclusively in Server Actions.

**Error handling (web):** Server Actions catch errors and return structured form state with `message` + `status`. Server Components throw on error (caught by Next.js error boundaries).

**Error handling (mobile):** Services throw on failures; screens catch and display error states. Auth provider has explicit error states + a 5s bootstrap timeout.

## Architectural Constraints

- **Shared domain types** live in `@glide/shared`. Both `@glide/api` and consuming apps import from here. No duplication of types across workspaces.
- **Mock data** lives in `@glide/api` alongside interface definitions. Mock data drives both apps when Supabase/env is not configured.
- **No backend server** — the web app is a direct Supabase client (BFF pattern via Server Components). No Express/Fastify layer.
- **Mobile services** resolve their data source at module load time based on environment variables. The data source cannot be changed at runtime without a reload.
- **Database schema** is managed via Supabase migrations in `supabase/migrations/` (13 migrations total). Types are generated from the database (see `database.types.ts`).
- **No API versioning** — mock data uses THB (Thai Baht) currency and Bangkok coordinates exclusively.

---

*Architecture analysis: 2026-06-27*
