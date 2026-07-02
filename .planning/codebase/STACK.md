# STACK.md

Current stack snapshot:

- Language: TypeScript across the monorepo, with some JavaScript config files
- Package manager: pnpm `10.33.4`
- Orchestration: Turbo `2.9.4`
- Testing: Jest in all workspaces, Testing Library in app workspaces, Playwright in the web app
- Mobile app: Expo `54`, React Native `0.81.5`, Expo Router `6.0.23`
- Web app: Next.js `16.2.3`, React `19.2.4`, Tailwind CSS `4`
- Shared backend client: `@supabase/supabase-js` `2.103.0`
- Web visualization/runtime libraries: `@react-three/fiber`, `three`, `leaflet`, `remotion`

Workspace scripts live in each package's `package.json`, while root scripts fan out through Turbo.
