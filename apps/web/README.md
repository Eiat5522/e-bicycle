# Glide Web

Next.js admin shell for future Glide operations tooling.

## Scripts

- `pnpm dev` starts the local admin app.
- `pnpm build` runs the production Next.js build.
- `pnpm test` runs Jest tests.
- `pnpm test:integration` runs Playwright browser smoke tests for public routing.
- `pnpm test:e2e` runs Playwright end-to-end tests.
- `pnpm test:e2e:ui` opens the Playwright UI runner for e2e specs.
- `pnpm typecheck` runs TypeScript checks.

## Playwright

Install the local browser binary before the first run:

- `pnpm exec playwright install chromium`

Run the browser test suites:

- `pnpm test:integration`
- `pnpm test:e2e`

The Playwright config starts a production-like Next.js server automatically on port `3100`. To point tests at an existing server instead, set `PLAYWRIGHT_BASE_URL`.

## Three.js Note

The login hero scene uses `@react-three/fiber` with `three` for the bicycle model.

Current stable versions in this workspace:

- `@react-three/fiber@9.6.0`
- `three@0.184.0`

In development, the browser console currently shows this upstream warning:

- `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.`

This warning is not caused by the app's login scene code. It comes from the installed `@react-three/fiber` stable build still constructing `THREE.Clock` internally while paired with `three@0.184.0`, where `Clock` is deprecated.

Current decision:

- keep the stable dependency pair as-is
- treat the warning as known, non-breaking dev-time noise
- reevaluate when a stable `@react-three/fiber` release removes the internal `Clock` usage

If the warning needs to be removed earlier, test the `@react-three/fiber` v10 alpha line in a branch first rather than downgrading `three`.
