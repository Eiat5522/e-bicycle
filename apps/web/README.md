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
