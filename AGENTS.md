# Repository Guidelines

## Project Structure & Module Organization

This repository is a `pnpm` workspace managed with Turbo. Keep app code inside `apps/` and shared logic inside `packages/`.

- `apps/mobile`: Expo Router customer app. Routes live in `app/`; reusable UI and feature code live in `src/`; static images live in `assets/images/`.
- `apps/web`: Next.js 16 admin shell. App Router files live in `src/app/`; shared UI lives in `src/components/`; public assets live in `public/`.
- `packages/api`: typed mock services and contracts used by both apps.
- `packages/shared`: shared domain models and formatting utilities.

Place tests next to the relevant workspace in `tests/` folders or as `*.test.ts(x)` beside components.

## Build, Test, and Development Commands

Run commands from the repo root unless you need a single workspace.

- `pnpm install`: install all workspace dependencies.
- `pnpm dev`: start all available dev tasks through Turbo.
- `pnpm build`: run workspace builds.
- `pnpm lint`: run ESLint across the monorepo.
- `pnpm test`: run all Jest suites.
- `pnpm typecheck`: run TypeScript checks across workspaces.

Useful workspace commands:

- `pnpm --filter @glide/mobile android`
- `pnpm --filter @glide/web dev`
- `pnpm --filter @glide/shared test`
- `npx playwright/cli -h`
- npx @mobilenext/mobilecli -h

## Coding Style & Naming Conventions

TypeScript is the default across apps and packages. Follow the existing style:

- Use 2-space indentation and double quotes in TS/TSX files.
- Prefer named exports for shared modules.
- Use `kebab-case` for route files, `PascalCase` for React components, and clear feature folders such as `src/features/map`.
- Run ESLint before submitting changes; configs live at the repo root and inside app workspaces.

## Testing Guidelines

Jest is used in every workspace, with Testing Library in the app projects. Name tests `*.test.ts` or `*.test.tsx` and keep them close to the code they verify. Cover shared utilities, service contracts, and user-facing component behavior. Run targeted tests with `pnpm --filter <workspace> test`.

## Commit & Pull Request Guidelines

Current history uses short Conventional Commit subjects such as `feat: add basic map functionalities`. Follow `type: summary` with lowercase types like `feat`, `fix`, or `chore`.

PRs should include a concise description, linked issue or task when available, and screenshots or screen recordings for UI changes in `apps/mobile` or `apps/web`. Note any affected workspaces and list the validation commands you ran.

## Agent-Specific Notes

If you touch `apps/web`, read [apps/web/AGENTS.md](/home/eiat/projects/e-bicycle/apps/web/AGENTS.md) first; it contains Next.js-specific guidance for that workspace.

<!-- OPENWIKI:START -->

## OpenWiki

This repository uses OpenWiki for recurring code documentation. Start with `openwiki/quickstart.md`, then follow its links to architecture, workflows, domain concepts, operations, integrations, testing guidance, and source maps.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
