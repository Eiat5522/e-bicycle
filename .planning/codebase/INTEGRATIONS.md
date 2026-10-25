# INTEGRATIONS.md

Core integration boundaries in this repo:

- Supabase powers auth, database reads/writes, and the admin API routes.
- Mobile uses `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Web uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for browser and server helpers.
- The admin service role key stays server-only and is used by web API routes and admin helpers.
- Expo Router owns the customer app navigation tree in `apps/mobile/app/`.
- Next.js App Router owns the admin shell and API routes in `apps/web/src/app/`.
- Playwright integration and E2E tests run against the web app's local server.
