# STRUCTURE.md

Top-level layout:

- `apps/mobile`: Expo Router customer app
- `apps/web`: Next.js admin app
- `packages/api`: typed service contracts and mock API helpers
- `packages/shared`: shared domain models and utility functions
- `.planning/codebase`: hand-maintained repo guidance and notes

Mobile app layout:

- `apps/mobile/app/`: route segments and screen entry points
- `apps/mobile/src/features/`: feature-level UI and logic
- `apps/mobile/src/lib/`: shared client-side helpers
- `apps/mobile/assets/images/`: static image assets

Web app layout:

- `apps/web/src/app/`: App Router pages, layouts, and API routes
- `apps/web/src/components/`: shared admin UI components
- `apps/web/src/lib/`: server and client helpers, including Supabase helpers
- `apps/web/public/`: public assets

Shared code layout:

- `packages/api/src/`: service contracts and mock backend helpers
- `packages/shared/src/`: domain entities and shared formatting utilities
