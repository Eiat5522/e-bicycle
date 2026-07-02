# Glide Mobile

Expo + React Native app for the customer-facing Glide e-bike experience.

## Supabase setup

1. Copy `apps/mobile/.env.example` to `apps/mobile/.env.local`.
2. Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the hosted Glide Supabase project.
3. If you need CLI access to the hosted project, link to it first with `supabase link --project-ref lcqxsopihpwhbvwrttvw`.
4. Use `supabase db push` to apply migrations to the linked hosted database.
5. Use `supabase db reset` only when you intentionally want a disposable local sandbox. That command resets the local database stack, which is where the `supabase_admin` owner/role appears.
6. If you are using the hosted Supabase project, keep Email auth enabled and disable email confirmation for this first-pass mobile flow.
7. `EXPO_PUBLIC_API_BASE_URL` is optional for bike data, and local Expo development can fall back to the Expo host for unlock/end-ride status sync, but set it explicitly if you want to point at a specific admin instance or non-local environment.

## Scripts

- `pnpm dev` starts Expo Router development.
- `pnpm build` exports the web bundle for CI verification.
- `pnpm test` runs Jest tests.
- `pnpm typecheck` runs TypeScript checks.
