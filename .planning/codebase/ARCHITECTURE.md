# ARCHITECTURE.md

This repo is a pnpm monorepo organized around two app surfaces and two shared packages.

- `apps/mobile`: Expo Router customer app
- `apps/web`: Next.js 16 admin shell
- `packages/api`: typed mock services and contracts shared by both apps
- `packages/shared`: domain models and formatting helpers shared by both apps

Routing and UI shape:

- Mobile route files live in `apps/mobile/app/`
- Web App Router files live in `apps/web/src/app/`
- Shared components and feature code live under each app's `src/` tree

Repository shape:

- Keep workspace-level code inside `apps/` or `packages/`
- Keep generated or app-specific assets inside the owning workspace
- Keep top-level docs and planning notes focused on repo-wide guidance
