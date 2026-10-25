# Copilot Instructions for Glide Monorepo

## Build, test, and lint commands

Run commands from the repository root unless a workspace-specific path is clearer.

- Install dependencies: `pnpm install`
- Start all workspace dev tasks: `pnpm dev`
- Build the monorepo: `pnpm build`
- Lint the monorepo: `pnpm lint`
- Run all Jest suites: `pnpm test`
- Run all TypeScript checks: `pnpm typecheck`

Useful workspace commands:

- Mobile Expo dev server: `pnpm --filter @glide/mobile dev`
- Mobile native targets: `pnpm --filter @glide/mobile android` / `pnpm --filter @glide/mobile ios`
- Web dev server: `pnpm --filter @glide/web dev`
- Shared package tests: `pnpm --filter @glide/shared test`

Run a single test file by passing the path after `--`:

- Mobile Jest example: `pnpm --filter @glide/mobile test -- src/features/map/map-screen.test.tsx`
- Web Jest example: `pnpm --filter @glide/web test -- src/app/login/actions.test.ts`
- Shared Jest example: `pnpm --filter @glide/shared test -- tests/fare.test.ts`
- API Jest example: `pnpm --filter @glide/api test -- tests/mock-services.test.ts`

Web browser suites live only in `apps/web`:

- Install Playwright Chromium once: `pnpm --filter @glide/web exec playwright install chromium`
- Integration suite: `pnpm --filter @glide/web test:integration`
- End-to-end suite: `pnpm --filter @glide/web test:e2e`
- Single Playwright spec: `pnpm --filter @glide/web test:e2e -- tests/e2e/<spec-file>`

## High-level architecture

This repository is a Turbo-managed `pnpm` monorepo with four main workspaces:

- `packages/shared` is the source of truth for cross-app domain models and utility logic such as fare and formatting helpers.
- `packages/api` exposes typed mock services and service interfaces used by both apps; it also contains the HTTP bike-service adapter used when a real API base URL is available.
- `apps/mobile` is the Expo Router customer app. Route files live under `app/`, while long-lived feature code lives under `src/features`, `src/lib`, `src/components`, and `src/theme`.
- `apps/web` is the Next.js 16 admin app. App Router entries live in `src/app`, reusable UI in `src/components`, and Supabase/auth helpers in `src/lib`.

The shared flow across workspaces is:

1. Define and reuse domain types in `@glide/shared`.
2. Reuse service contracts or mock implementations from `@glide/api`.
3. Let each app choose its runtime data source and UI shell on top of those shared contracts.

Mobile-specific architecture:

- `apps/mobile/app/_layout.tsx` is the composition root. It loads fonts, controls the splash screen, and wraps the app with `AuthProvider` and `RideSessionProvider`.
- Mobile auth is Supabase-backed when `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are present.
- Bike data is selected dynamically in `src/lib/bike-service.ts`: explicit mock mode, HTTP API mode, Supabase mode, or fallback mock services from `@glide/api`.
- Wallet and other rider data follow the same pattern: prefer Supabase when configured, otherwise fall back to typed mock services.

Web-specific architecture:

- `apps/web/src/app/(admin)` contains the authenticated admin shell. `requireAdmin()` in `src/lib/auth.ts` gates those routes by checking the Supabase user and profile.
- `apps/web/src/lib/supabase/server.ts` creates the server-side Supabase client from `await cookies()`, so web auth logic is built around Next.js server components and server actions.
- `apps/web/src/app/api/bikes/[bikeId]/status/route.ts` is the API route that updates bike status in Supabase. The mobile app can target this route through `EXPO_PUBLIC_API_BASE_URL` so rider actions stay visible in the admin panel.

## Key conventions

- Treat `@glide/shared` as the canonical place for cross-workspace types. When a shape is shared between mobile, web, and services, update `packages/shared` first instead of creating app-local duplicates.
- Prefer the existing service wrappers in `apps/mobile/src/lib` and `apps/web/src/lib` over calling Supabase directly from screens or components.
- Check the workspace-specific Supabase guard before assuming live backend access:
  - mobile: `hasSupabaseConfig` in `apps/mobile/src/lib/supabase.ts`
  - web: `hasSupabaseConfig` in `apps/web/src/lib/supabase/config.ts`
- Mobile styling should come from `apps/mobile/src/theme/tokens.ts`; screens and components already centralize colors, spacing, radii, typography, and shadows there.
- Web styling is built around Tailwind 4 plus the `clay-*` utility classes and CSS variables defined in `apps/web/src/app/globals.css`. Reuse those classes before inventing one-off visual patterns.
- If you touch `apps/web`, read `apps/web/AGENTS.md` and `apps/web/CLAUDE.md` first. That workspace is pinned to Next.js 16 and already follows async request APIs such as `await cookies()` and route `params` that may arrive as promises.
- Tests are usually colocated with the feature they cover in app workspaces, while package tests live under `tests/`. The existing Jest scripts already run with `--runInBand`; pass a file path after `--` when you want to scope execution.
- Shared modules use named exports, route files use `kebab-case`, and React components use `PascalCase`.
