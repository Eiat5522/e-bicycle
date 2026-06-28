# Codebase Structure

**Analysis Date:** 2026-06-27

## Repository Layout

```
e-bicycle/
├── apps/                     # Application workspaces
│   ├── mobile/               # Expo React Native customer app
│   └── web/                  # Next.js admin panel
├── packages/                 # Shared library workspaces
│   ├── api/                  # Service interfaces + mock implementations
│   └── shared/               # Domain types + utility functions
├── supabase/                 # Database migrations + seed data
│   ├── migrations/           # 13 timestamped SQL migrations
│   ├── seed.sql              # Seed data
│   └── config.toml           # Supabase project configuration
├── .planning/                # GSD planning artifacts (codebase docs, roadmaps)
├── .agents/                  # Agent skills and configuration
├── .github/                  # GitHub workflows, templates
├── docs/                     # Project documentation
├── home/                     # Additional documentation/home assets
├── conductor/                # Orchestration scripts
├── turbo.json                # Turborepo task configuration
├── pnpm-workspace.yaml       # pnpm workspace definition
├── package.json              # Root workspace ("glide-monorepo")
├── tsconfig.base.json        # Shared TypeScript compiler options
└── eslint.config.mjs         # Root ESLint flat config
```

## Workspace Organization

### `@glide/mobile` (`apps/mobile/`)

```
apps/mobile/
├── app/                      # Expo Router file-based routing
│   ├── _layout.tsx           # Root layout (AuthProvider, RideSessionProvider, Stack)
│   ├── index.tsx             # Entry — redirects to (tabs)
│   ├── (auth)/               # Auth route group (login, signup, welcome, callback)
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── callback.tsx
│   ├── (tabs)/               # Main tab navigator
│   │   ├── _layout.tsx       # Bottom tabs: Map, Wallet, Scan, Eco, Profile
│   │   ├── index.tsx         # Map tab
│   │   ├── wallet.tsx
│   │   ├── scan.tsx          # QR scan (redirects to unlock flow)
│   │   ├── eco.tsx           # Eco impact
│   │   └── profile.tsx
│   ├── bike/[id].tsx         # Bike detail screen (dynamic route)
│   ├── unlock/[id].tsx       # Unlock flow
│   ├── ride/
│   │   ├── active.tsx        # Active ride screen
│   │   ├── summary.tsx       # Post-ride summary
│   │   └── history/[id].tsx  # Ride history detail (modal)
│   └── help/
│       └── index.tsx         # Support screen
├── src/
│   ├── components/           # Shared UI components
│   │   ├── primary-button.tsx
│   │   ├── screen-shell.tsx  # Standard screen layout wrapper
│   │   └── surface-card.tsx  # Card component
│   ├── features/             # Feature-scoped modules
│   │   ├── auth/             # Auth provider, gate, screens
│   │   ├── bike/             # Bike detail screen
│   │   ├── ride/             # Active ride, summary, history, tracking, replay
│   │   ├── map/              # Map canvas, markers, bike distance utilities
│   │   ├── unlock/           # Unlock screen + flow
│   │   ├── wallet/           # Wallet screen, bank logo mapping
│   │   ├── profile/          # Profile screen
│   │   ├── eco-impact/       # Eco impact screen, badges, stats
│   │   └── support/          # Chat support + help screens
│   ├── lib/                  # Service instances, Supabase client, types
│   │   ├── supabase.ts       # Mobile Supabase client (AsyncStorage)
│   │   ├── supabase.types.ts # Generated DB types
│   │   ├── bike-service.ts   # Configured bike service (mock/api/supabase)
│   │   ├── bike-status-service.ts
│   │   ├── ride-history-service.ts
│   │   ├── unlock-service.ts
│   │   ├── wallet-service.ts
│   │   └── reward-milestones.ts
│   ├── navigation/           # Navigation config (tab bar style, scan tab redirect)
│   └── theme/                # Design tokens
│       └── tokens.ts         # Colors, spacing, radii, typography, shadows
├── assets/
│   └── images/
├── app.json                  # Expo config
├── metro.config.js           # Metro bundler config
└── package.json              # @glide/mobile workspace
```

### `@glide/web` (`apps/web/`)

```
apps/web/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # Root layout (fonts, globals CSS)
│   │   ├── globals.css       # Tailwind v4 + clay design system styles
│   │   ├── favicon.ico
│   │   ├── login/            # Admin login
│   │   │   ├── page.tsx
│   │   │   ├── actions.ts            # signIn server action
│   │   │   ├── login-form.tsx        # Client component form
│   │   │   ├── login-form-state.ts   # Form state type + initial
│   │   │   ├── login-hero-scene.tsx  # Three.js animated background
│   │   │   └── login-form-hooks.tsx
│   │   ├── api/bikes/[bikeId]/route.ts  # REST API endpoint
│   │   └── (admin)/          # Admin section (protected)
│   │       ├── layout.tsx    # Admin shell (brand, nav, sign out)
│   │       ├── page.tsx      # Home nav cards
│   │       ├── actions.ts    # Server actions: createUser, updateUser, signOut
│   │       ├── dashboard/
│   │       │   ├── page.tsx
│   │       │   └── loading.tsx
│   │       ├── users/
│   │       │   └── page.tsx  # User management table
│   │       └── bicycles/
│   │           ├── layout.tsx        # Parallel routes (children + @drawer)
│   │           ├── page.tsx          # Fleet list with Supabase query
│   │           ├── actions.ts        # CRUD server actions
│   │           ├── loading.tsx
│   │           ├── new/
│   │           │   └── page.tsx      # Create bike form
│   │           ├── [bikeId]/
│   │           │   ├── page.tsx      # Bike detail page
│   │           │   └── data.ts       # Bike detail + ride history data
│   │           └── @drawer/          # Parallel route slot (side drawer)
│   │               ├── default.tsx
│   │               └── (.)[bikeId]/
│   │                   └── page.tsx  # Intercepted bike detail in drawer
│   ├── components/           # Shared UI components
│   │   ├── admin-nav.tsx              # Navigation tabs (Home/Dashboard/Users/Bicycles)
│   │   ├── admin-shell.tsx            # Dashboard with Executive/Operations tabs
│   │   ├── bicycle-management.tsx      # Fleet list + detail (1175 lines)
│   │   ├── executive-scorecard.tsx     # KPI metric cards + trends + insights
│   │   ├── kpi-trend-charts.tsx        # Recharts trend visualizations
│   │   ├── operations-dashboard.tsx    # Operations view
│   │   ├── user-management-table.tsx   # Users table
│   │   ├── side-drawer.tsx             # Slide-in drawer overlay
│   │   ├── status-toast.tsx            # Success/error toast notification
│   │   ├── glide-brand.tsx             # Glide logo/brand component
│   │   └── (test files)               # *.test.tsx alongside each component
│   └── lib/                  # Utilities and Supabase clients
│       ├── auth.ts           # getAuthContext, requireAdmin
│       ├── formatting.ts     # formatAdminDate
│       ├── validation.ts     # Form validation functions
│       └── supabase/
│           ├── config.ts           # Supabase URL + key config check
│           ├── server.ts           # createClient (SSR with cookies)
│           ├── client.ts           # createClient (browser)
│           ├── admin.ts            # createAdminClient (service role)
│           ├── auth-errors.ts      # Auth error type detection
│           ├── database.types.ts   # Generated DB types (profiles, bikes, wallets, etc.)
│           └── proxy.ts            # Supabase proxy config
├── tests/
│   ├── integration/          # Playwright integration tests
│   ├── e2e/                  # Playwright E2E tests
│   └── helpers/              # Test utilities
├── public/                   # Static assets (favicon, logo)
├── next.config.ts            # Next.js config (image remote patterns, transpile packages)
├── postcss.config.mjs        # PostCSS with Tailwind
├── playwright.config.ts      # Playwright test configuration
├── jest.config.js            # Jest configuration
├── jest.setup.js             # Jest setup (Testing Library matchers)
└── package.json              # @glide/web workspace
```

### `@glide/api` (`packages/api/`)

```
packages/api/
├── src/
│   └── index.ts              # Service interfaces + mock implementations + HTTP client factory
├── tests/                    # Jest tests
├── dist/                     # Declaration output
├── package.json              # @glide/api workspace (depends on @glide/shared)
└── tsconfig.json
```

### `@glide/shared` (`packages/shared/`)

```
packages/shared/
├── src/
│   ├── index.ts              # Re-exports all modules
│   ├── domain.ts             # Domain types: Bike, Ride, Wallet, User, UnlockRequest, etc.
│   ├── fare.ts               # Fare calculation: calculateBillableMinutes, calculateRideRevenue
│   └── formatters.ts         # formatCurrency (THB), formatDistanceKm, formatDuration
├── tests/                    # Jest tests
├── dist/                     # Declaration output
├── package.json              # @glide/shared workspace
└── tsconfig.json
```

### `supabase/` (Root)

```
supabase/
├── config.toml               # Supabase project config
├── seed.sql                  # Seed data
└── migrations/               # Timestamped SQL migrations
    ├── 20260411093000_create_profiles.sql
    ├── 20260411104903_create_wallets.sql
    ├── 20260411170000_create_bikes.sql
    ├── 20260413123912_add_admin_roles_to_profiles.sql
    ├── 20260413132053_allow_admin_wallet_reads.sql
    ├── 20260413133749_add_bicycle_admin_management_v2.sql
    ├── 20260414111741_add_profile_link_to_bike_ride_history.sql
    ├── 20260414112254_remove_public_bike_image_listing_policy.sql
    ├── 20260414191548_restore_admin_profile_and_wallet_policies.sql
    ├── 20260420121141_add_active_rider_id_to_bikes.sql
    ├── 20260421080801_add_ride_revenue_calculation.sql
    ├── 20260421180718_align_pricing_labels_to_thb.sql
    └── 20260422013000_add_reward_milestones.sql
```

## Directory Purposes

**`apps/mobile/app/`** — Expo Router file-based routes. Each file maps to a screen. Route groups `(auth)` and `(tabs)` organize logical sections. Dynamic routes `[id]` for bike detail, unlock, and ride history.

**`apps/mobile/src/features/`** — Feature-scoped modules. Each subdirectory contains the screen component, any sub-components, utilities, and hooks specific to that feature. Tests are co-located (`*.test.tsx`).

**`apps/mobile/src/lib/`** — Service resolution layer. Each file (e.g., `bike-service.ts`) exports a configured service instance that resolves its data source at module load time and provides fallback behavior.

**`apps/mobile/src/components/`** — Reusable UI primitives shared across features. Small set (4 components) — most UI lives in feature modules.

**`apps/mobile/src/theme/`** — Single file (`tokens.ts`) exporting design token constants. No CSS-in-JS library; tokens are used as inline style objects.

**`apps/web/src/app/(admin)/`** — Protected admin routes behind `requireAdmin()` guard. Uses parallel routes (`@drawer`) for the bike detail side drawer pattern.

**`apps/web/src/components/`** — Admin UI components, all co-located with test files. Larger components (`bicycle-management.tsx` at 1175 lines) include both list and detail views.

**`apps/web/src/lib/supabase/`** — Supabase client factories (`server.ts`, `client.ts`, `admin.ts`), config, auth error helpers, and generated database types.

**`packages/shared/src/`** — Pure TypeScript with zero dependencies. Domain types use `readonly` on all properties. Utility functions validate inputs and throw descriptive errors.

**`packages/api/src/`** — Single file containing all service interfaces, mock data, and HTTP client factory. Mock data represents a Bangkok e-bike fleet with THB pricing.

**`supabase/migrations/`** — Ordered SQL migrations. Migration 20260411093000 is the earliest (profiles table). Latest is 20260422013000 (reward milestones). Migrations cover auth, admin roles, RLS policies, bike management, ride history, wallet top-ups, and pricing labels.

## Key File Locations

**Entry Points:**
- `apps/mobile/app/_layout.tsx` — Mobile app root (font loading, splash screen, provider tree, stack navigator)
- `apps/web/src/app/layout.tsx` — Web app root (Manrope + Space Grotesk fonts, global CSS)
- `apps/mobile/app/index.tsx` — Mobile app entry screen (redirects to tabs or auth)

**Configuration:**
- `turbo.json` — Turborepo pipeline definitions (build, dev, lint, test, typecheck)
- `pnpm-workspace.yaml` — Workspace glob definition (`apps/*`, `packages/*`)
- `tsconfig.base.json` — Shared TS options (ES2022, strict, bundler module resolution)
- `apps/mobile/app.json` — Expo SDK config
- `apps/web/next.config.ts` — Next.js config (image remote patterns, transpilePackages)
- `apps/web/postcss.config.mjs` — PostCSS with Tailwind CSS v4

**Core Data (Seed Data):**
- `packages/api/src/index.ts` — All mock data: 6 bikes (G-104 through G-620), 3 ride history items, wallet with 2 transactions, admin overview with KPI summary

**Database:**
- `apps/web/src/lib/supabase/database.types.ts` — Generated TypeScript types for all Supabase tables
- `apps/mobile/src/lib/supabase.types.ts` — Mobile-specific generated types (Profile type re-exported)
- `supabase/migrations/` — All database schema migrations

## Naming Conventions

**Files:**
- **Route files:** `kebab-case` (`ride-history`, `user-management-table`, `eco-impact`)
- **Screen components:** `kebab-case.tsx` with PascalCase export (`MapScreen`, `LoginForm`)
- **Utility files:** `kebab-case.ts` with camelCase exports (`bike-service.ts`, `validation.ts`)
- **Test files:** `*.test.ts` / `*.test.tsx` co-located with source (both apps)
- **React components:** PascalCase exports from kebab-case files (`export function PrimaryButton`)
- **State files:** `*-form-state.ts` / `*-hooks.ts` / `*-context.tsx`

**Directories:**
- Route groups: `(auth)/`, `(tabs)/`, `(admin)/` — parentheses denote route groups (no URL segment)
- Feature dirs: lowercase, hyphen-separated (`eco-impact`, `ride`, `wallet`)
- Parallel route slots: `@drawer/` — `@` prefix for Next.js parallel routes
- Intercepted routes: `(.)[bikeId]/` — `(.)` prefix for Next.js intercepting routes

**Exports:**
- Named exports preferred over default exports
- Service instances use `camelCase` (`bikeService`, `walletService`)
- Configured service instances prefixed with `configured` (`configuredBikeService`, `configuredWalletService`)
- Form state types: `XxxFormState` with `initialXxxFormState` constant

## Where to Add New Code

**New Mobile Feature (e.g., "notifications"):**
- Route: `apps/mobile/app/notifications/index.tsx`
- Feature code: `apps/mobile/src/features/notifications/` — screen component, sub-components, hooks
- Service (if needed): `apps/mobile/src/lib/notification-service.ts` — API/Supabase client wrapper
- Tests: co-located `*.test.tsx` in same directory as source
- Tab (if applicable): add to `apps/mobile/app/(tabs)/_layout.tsx`

**New Admin Section:**
- Route: `apps/web/src/app/(admin)/new-section/page.tsx`
- Server actions: `apps/web/src/app/(admin)/new-section/actions.ts`
- Client components: `apps/web/src/components/new-section-*.tsx`
- Tests: co-located `*.test.tsx` in components directory
- Nav item: add to `apps/web/src/components/admin-nav.tsx`

**New Domain Type:**
- Add to `packages/shared/src/domain.ts` (or new file, export from `index.ts`)
- Use `readonly` on all interface properties
- Add utility functions in `packages/shared/src/` (e.g., calculation helpers)
- Update `packages/shared/src/index.ts` barrel exports

**New Database Table:**
- Migration: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
- Types: generate via Supabase CLI, place in both `apps/web/src/lib/supabase/database.types.ts` and `apps/mobile/src/lib/supabase.types.ts`
- Domain type (if not auto-generated): add to `packages/shared/src/domain.ts`
- Service interface: add to `packages/api/src/index.ts`
- Service implementation: add to appropriate `apps/mobile/src/lib/` file

## Special Directories

**`.planning/`** — GSD (Goal-Driven Development) planning artifacts:
- `.planning/codebase/` — Generated codebase analysis documents (this directory)
- Used by `/gsd-plan-phase` and `/gsd-execute-phase` for context
- Not committed to git? (likely)

**`.agents/`** — Project-specific agent skill definitions and configuration files

**`apps/mobile/assets/images/`** — Static image assets for the mobile app (referenced in `app.json`)

**`apps/web/public/`** — Web static assets (favicon, logo). Served from `/` at build time.

**`apps/web/tests/`** — Playwright test suites:
- `integration/` — Integration tests
- `e2e/` — End-to-end tests
- `helpers/` — Test helpers

**`dist/` directories** (in packages) — TypeScript declaration output (`*.d.ts`, `*.d.ts.map`). Generated by `tsc --emitDeclarationOnly`. Not committed? (not in `.gitignore` but likely gitignored at package level)

---

*Structure analysis: 2026-06-27*
