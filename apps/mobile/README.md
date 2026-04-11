# Glide Mobile

Expo + React Native app for the customer-facing Glide e-bike experience.

## Supabase setup

1. Copy `apps/mobile/.env.example` to `apps/mobile/.env.local`.
2. Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your Supabase project.
3. Start the local Supabase stack with `supabase start`.
4. Apply migrations and seed local data with `supabase db reset`.
5. If you are using the hosted Supabase project instead of the local stack, keep Email auth enabled and disable email confirmation for this first-pass mobile flow.

## Scripts

- `pnpm dev` starts Expo Router development.
- `pnpm build` exports the web bundle for CI verification.
- `pnpm test` runs Jest tests.
- `pnpm typecheck` runs TypeScript checks.
