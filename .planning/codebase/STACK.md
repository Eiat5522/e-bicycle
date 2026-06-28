# Stack

**Analysis Date:** 2026-06-27

## Languages

| Language | Version | Where Used |
|---|---|---|
| TypeScript | ~5.9.x | All workspaces (apps/ and packages/) |
| SQL | — | `supabase/migrations/` (13 migration files) |
| CSS | — | `apps/web/src/app/globals.css` (Tailwind + claymorphism) |

## Package Manager & Monorepo

- **Manager:** pnpm `10.33.4` — `packageManager` in root `package.json`
- **Lock file:** `pnpm-lock.yaml`
- **Workspace definition:** `pnpm-workspace.yaml` — globs `apps/*` and `packages/*`
- **Monorepo orchestration:** Turbo `2.9.4` (`turbo.json`)
  - Tasks: `build`, `dev` (parallel), `lint`, `test`, `typecheck`
  - Build outputs: `.next/**`, `dist/**`

## Workspaces

| Package | Path | Purpose |
|---|---|---|
| `@glide/mobile` | `apps/mobile` | Customer-facing e-bike rental app (Expo / React Native) |
| `@glide/web` | `apps/web` | Admin panel (Next.js 16) |
| `@glide/api` | `packages/api` | TypeScript service interfaces + mock implementations |
| `@glide/shared` | `packages/shared` | Shared domain models, fare calculation, formatters |

## Frontend — Mobile (`apps/mobile`)

| Technology | Version | Purpose |
|---|---|---|
| React | 19.1.0 | UI framework |
| React Native | 0.81.5 | Native mobile rendering |
| Expo | ~54.0.33 | Managed RN framework |
| Expo Router | ~6.0.23 | File-based routing (`app/` directory) |
| expo-image | ~3.0.11 | Optimized image loading |
| expo-location | ^19.0.8 | GPS / location services |
| expo-haptics | ~15.0.8 | Haptic feedback |
| expo-linking | ~8.0.11 | Deep link handling |
| expo-splash-screen | ~31.0.13 | Splash screen config |
| expo-font | ~14.0.11 | Font loading |
| expo-symbols | ~1.0.8 | SF Symbols |
| expo-web-browser | ~15.0.10 | External browser auth flows |
| react-native-maps | ^1.20.1 | Native map views |
| react-native-reanimated | ~4.1.1 | Animations |
| react-native-gesture-handler | ~2.28.0 | Gesture handling |
| react-native-safe-area-context | ~5.6.0 | Safe area insets |
| react-native-screens | ~4.16.0 | Native screen containers |
| @react-navigation/bottom-tabs | ^7.4.0 | Bottom tab navigator |
| @expo/vector-icons | ^15.0.3 | Icon library (MaterialIcons) |
| @expo-google-fonts/space-grotesk | ^0.4.1 | Space Grotesk font |
| @react-native-async-storage/async-storage | 2.2.0 | Persistent key-value storage |
| react-native-url-polyfill | ^3.0.0 | URL polyfill for RN |
| react-native-worklets | 0.5.1 | Worklet support |

**Web target:** `expo export --platform web` generates static output.

## Frontend — Web (`apps/web`)

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.2.3 | React framework with App Router |
| React | 19.2.4 | UI framework |
| Tailwind CSS | ^4 | Utility-first CSS (via `@tailwindcss/postcss`) |
| Leaflet | ^1.9.4 | Web maps (ride route display) |
| Recharts | ^3.8.1 | KPI trend charts (admin dashboard) |
| Three.js | ^0.184.0 | 3D (login hero scene) |
| @react-three/fiber | ^9.6.0 | React renderer for Three.js |
| Remotion | ^4.0.448 | Video rendering |
| @remotion/player | ^4.0.448 | In-browser Remotion video player |
| @remotion/three | ^4.0.448 | Three.js integration with Remotion |
| Manrope + Space Grotesk | — | Fonts via `next/font/google` |

**Styling approach:** Custom "claymorphism" CSS design system defined as CSS classes in `globals.css` (`.clay-card`, `.clay-inset`, `.clay-button`, etc.) combined with Tailwind utility classes.

## Backend / Database

| Technology | Version | Purpose |
|---|---|---|
| Supabase | ^2.103.0 (supabase-js SDK) | Backend-as-a-Service (PostgreSQL, Auth, Storage) |
| Supabase SSR | ^0.10.2 | Server-side auth for Next.js (`@supabase/ssr`) |
| Postgres | 14.5 | Database (via Supabase) |

**Database schema** (`supabase/migrations/` — 13 files):
- `profiles` — User profiles with `is_admin` flag
- `bikes` — Bike inventory (status, GPS coordinates, pricing)
- `wallets` — Rider wallet balances and points
- `wallet_transactions` — Ride/top-up/reward transaction log
- `bike_ride_history` — Completed ride records (routes, checkpoints, costs)
- **Database functions:** `apply_wallet_top_up`, `complete_ride`
- **Enums:** `bike_status` (`available`, `reserved`, `in_use`, `maintenance`)

**Local Supabase** (`supabase/config.toml`):
- API port: 54321
- DB port: 54322
- Studio port: 54323
- Inbucket (email testing): 54324-54326
- Auth enabled with email/password

## Infrastructure & DevOps

| Area | Status |
|---|---|
| Docker | Not detected |
| CI/CD (GitHub Actions) | Not detected |
| Hosting | Not configured (no hosting provider detected) |

## Testing

| Tool | Workspace | Purpose |
|---|---|---|
| Jest 29.7.0 | Root, all workspaces | Test runner |
| ts-jest 29.4.9 | Root | TypeScript Jest transformer |
| @testing-library/react-native 13.3.0 | `apps/mobile` | RN component testing |
| jest-expo 54 | `apps/mobile` | Expo Jest preset |
| @testing-library/react | `apps/web` | React component testing |
| @testing-library/jest-dom | `apps/web` | DOM matchers |
| jest-environment-jsdom | `apps/web` | JSDOM test environment |
| Playwright 1.59.1 | `apps/web` | E2E and integration tests |
| @playwright/test 1.59.1 | `apps/web` | Playwright test framework |

**Test commands:**
- `pnpm test` — run all Jest suites across all workspaces
- `pnpm --filter @glide/web test:e2e` — Playwright E2E (Chromium only)
- `pnpm --filter @glide/shared test` — single-workspace Jest

## Tooling

| Tool | Version | Purpose |
|---|---|---|
| TypeScript | ~5.9.x | Language |
| ESLint | 9.x | Linting (root config `eslint.config.mjs` + per-workspace) |
| typescript-eslint | 8.58.0 | TS ESLint rules |
| Turbo | 2.9.4 | Monorepo task orchestration |
| pnpm | 10.33.4 | Package manager |
| Metro | — | React Native bundler (`apps/mobile/metro.config.js`) |
| PostCSS | — | CSS processing with `@tailwindcss/postcss` |

**TypeScript config:** Strict mode enabled. Target ES2022, module ESNext, bundler module resolution. Path aliases: `@/*` → `./src/*` in both apps.

---

*Stack analysis: 2026-06-27*
