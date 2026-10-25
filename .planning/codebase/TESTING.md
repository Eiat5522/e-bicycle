# TESTING.md

Testing matrix:

- Unit tests: Jest in each workspace, colocated next to the code they cover
- Component tests: Testing Library for React Native and React
- Integration tests: Playwright for the web app's public routing and admin flows
- Type checks: workspace-local `tsc --noEmit` scripts, or the root `pnpm typecheck`

Common commands:

- `pnpm test`
- `pnpm test:mobile`
- `pnpm test:web`
- `pnpm --filter @glide/web test:integration`
- `pnpm --filter @glide/web test:e2e`
- `pnpm lint`
- `pnpm typecheck`

Notes:

- Web Playwright tests expect Chromium to be installed locally before first run.
- Tests that depend on environment variables should set or delete those variables explicitly inside the test case.
- Keep new tests close to the code they verify, usually in the same directory with a `.test.ts` or `.test.tsx` suffix.
