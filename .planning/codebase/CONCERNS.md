# CONCERNS.md

Known areas to watch in this repo:

- Environment drift: Supabase and Expo config depend on the correct `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` values being present in the right workspace.
- Secret handling: local `.env.local` files should stay ignored, while example env files remain trackable.
- Tooling drift: the monorepo relies on workspace-local scripts plus Turbo orchestration, so README and package scripts should stay in sync.
- Test brittleness: several tests depend on module-level env setup, so they should clear or override env keys explicitly.
- Browser setup: Playwright-based web tests need the browser binary installed before first run.
- Manual docs: the planning docs in `.planning/codebase/` are maintained by hand, so placeholder text can quietly erase useful repo guidance.
