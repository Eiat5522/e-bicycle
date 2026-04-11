# Glide Mobile

Expo + React Native app for the customer-facing Glide e-bike experience.

## Supabase setup

1. Copy `apps/mobile/.env.example` to `apps/mobile/.env.local`.
2. Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your Supabase project.
3. Apply the SQL in [supabase/migrations/20260411093000_create_profiles.sql](/home/eiat/projects/e-bicycle/supabase/migrations/20260411093000_create_profiles.sql:1).
4. In the Supabase dashboard, keep Email auth enabled and disable email confirmation for this first-pass mobile flow.

## Scripts

- `pnpm dev` starts Expo Router development.
- `pnpm build` exports the web bundle for CI verification.
- `pnpm test` runs Jest tests.
- `pnpm typecheck` runs TypeScript checks.
