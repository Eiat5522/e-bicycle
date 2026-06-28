# Coding Conventions

**Analysis Date:** 2026-06-27

## Language & Runtime

- **TypeScript** (`^5.9.3`) is used across all workspaces — `apps/mobile`, `apps/web`, `packages/api`, `packages/shared`.
- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true` in `tsconfig.base.json`.
- Module resolution: `Bundler`, target: `ES2022`, module: `ESNext`.

## Naming Conventions

### Files
| Pattern | Example | Where |
|---------|---------|-------|
| `kebab-case` for route/directory files | `user-update-form-state.ts`, `bike-marker-drawer.tsx` | `apps/web/src/app/`, `apps/mobile/src/features/` |
| `PascalCase` for React component files | `admin-shell.tsx`, `primary-button.tsx` | `apps/web/src/components/`, `apps/mobile/src/components/` |
| `camelCase` for utility/service files | `formatters.ts`, `auth.ts`, `bike-service.ts` | `packages/`, `apps/*/src/lib/` |
| `kebab-case` with `.spec.ts` for Playwright | `login.spec.ts`, `public-routing.spec.ts` | `apps/web/tests/` |
| `*.test.ts` / `*.test.tsx` for Jest tests | `auth.test.ts`, `map-screen.test.tsx` | Co-located with source |

### Code Identifiers
| Construct | Convention | Example |
|-----------|-----------|---------|
| Interfaces | `PascalCase` with no `I` prefix | `AdminProfile`, `AuthContextValue` |
| Types (type aliases) | `PascalCase` | `DashboardTab`, `AuthStatus`, `LoadState` |
| Functions | `camelCase` | `formatCurrency`, `getAuthContext`, `requireAdmin` |
| React Components | `PascalCase`, named function | `function AdminShell()`, `function PrimaryButton()` |
| React Hooks | `camelCase` prefixed with `use` | `useAuth`, `useRouter`, `useSafeAreaInsets` |
| Constants | `UPPER_SNAKE` or `PascalCase` | `MAP_POLL_INTERVAL_MS`, `DEFAULT_MAP_COORDINATES` |
| Enums | String union types preferred over `enum` keyword | `type AuthStatus = "loading" \| "authenticated" \| ...` |
| CSS Variables | `--kebab-case` in `CSSProperties` objects | `--dashboard-bg`, `--dashboard-accent` |

### `readonly` Modifier

All interface properties, function parameters (props), and `as const` objects use `readonly`:

```typescript
// Interface with readonly props
export interface AdminProfile {
  readonly id: string;
  readonly firstName: string;
  readonly isAdmin: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// Component props with readonly
interface PrimaryButtonProps {
  readonly label: string;
  readonly onPress?: (event: GestureResponderEvent) => void;
  readonly variant?: "primary" | "secondary";
  readonly disabled?: boolean;
}
```

### Type vs Interface

- `interface` for object shapes that may be extended (public APIs, contexts).
- `type` for unions, tuples, and computed types.
- `import type { ... }` is used consistently for type-only imports (`apps/web/src/lib/auth.ts`, `apps/mobile/src/features/map/map-screen.tsx`).

## File Organization

### Directory Structure
```
apps/web/src/
  app/            # Next.js App Router pages & API routes
  components/     # Shared React components
  lib/            # Utilities, Supabase clients, auth logic
apps/mobile/src/
  app/            # Expo Router route files (file-based routing)
  components/     # Shared React Native components
  features/       # Feature-sliced modules (auth, map, ride, unlock, wallet, profile)
  lib/            # Service configurations, Supabase client
  theme/          # Design tokens (colors, spacing, typography)
  navigation/     # Navigation configuration
packages/shared/src/   # Domain models (domain.ts), fare logic, formatters
packages/api/src/      # Mock services, HTTP service factories, seed data
```

### Key Principles
- **Feature folders** in mobile: `apps/mobile/src/features/{feature-name}/` contain all related components, hooks, and tests.
- **Barrel files** (`index.ts`) re-export public API for packages (`packages/shared/src/index.ts`, `packages/api/src/index.ts`).
- Tests are **co-located** with source files in `apps/` (e.g., `admin-shell.test.tsx` beside `admin-shell.tsx`).
- Package tests live in a separate `tests/` directory (`packages/shared/tests/`, `packages/api/tests/`).

## Import Patterns

### Ordering
1. External / framework imports (React, Next.js, Expo, Testing Library)
2. Internal workspace imports (`@glide/api`, `@glide/shared`)
3. Path alias imports (`@/components/...`, `@/features/...`)
4. Relative sibling imports (`./map-canvas`, `./bike-distance`)

Each group separated by a blank line. Named imports preferred over namespace imports.

### Path Aliases
- `@/` → `src/` (both apps, configured in jest and tsconfig)
- `@glide/api` → `packages/api/src/index.ts` (workspace reference)
- `@glide/shared` → `packages/shared/src/index.ts` (workspace reference)

### Style
```typescript
// External
import { fireEvent, render, screen } from "@testing-library/react-native";

// Workspace
import type { Coordinates, NearbyBikesResult } from "@glide/shared";

// Path alias
import { PrimaryButton } from "@/components/primary-button";
import { useAuth } from "@/features/auth/auth-provider";

// Relative
import { calculateDistanceKm } from "./bike-distance";
```

## Component Patterns

### React (web - Next.js)
- Client components use `"use client"` directive at the top of the file (`apps/web/src/components/admin-shell.tsx`).
- Server components are the default (no directive).
- Props destructured at the function signature with explicit inline type annotation.
- Tailwind CSS v4 classes via `className`.
- CSS custom properties for theming via `style={dashboardTheme}` objects.

```typescript
"use client";

import { useState } from "react";

export function AdminShell() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("executive");
  return (
    <section className="flex flex-col gap-6" style={dashboardTheme}>
      {/* ... */}
    </section>
  );
}
```

### React Native (mobile - Expo)
- `StyleSheet.create()` for styles at the bottom of the file.
- Design tokens imported from `@/theme/tokens`.
- `accessibilityRole` and `accessibilityLabel` used for accessibility.
- `Pressable` over `TouchableOpacity` / `TouchableHighlight`.

```typescript
export function PrimaryButton({ label, onPress, variant = "primary", disabled = false }: PrimaryButtonProps) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={...}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", borderRadius: radii.pill, ... },
  primary: { backgroundColor: colors.coral },
  label: { ...typography.button, color: colors.text }
});
```

### Service/Data Layer (`packages/api`)
- Interface-based service abstraction (`BikeService`, `WalletService`, `SupportService`).
- Mock implementations with hardcoded seed data.
- Factory functions for HTTP-backed implementations (`createHttpBikeService`).
- Services return Promises (async contract even for mocks).

## Error Handling

### Pattern
- Throw `Error` with descriptive messages in domain logic (`packages/shared/src/formatters.ts`).
- Early-return `null` for auth context when session is missing (`apps/web/src/lib/auth.ts`).
- Error states surfaced to UI components via state variables (`errorMessage`, `loadState`).
- `try/catch` with `.catch()` or async/await in service layers.

### Auth Error Handling
- `isMissingAuthSessionError()` utility to distinguish recoverable vs. unexpected auth failures.
- Supabase config disabled → return `null` gracefully.

## Linting & Formatting

**ESLint** (flat config in `eslint.config.mjs`):
- `@eslint/js` recommended rules
- `typescript-eslint` recommended rules
- Package-scoped `projectService: true` for type-aware linting
- Ignores: `dist/`, `coverage/`, `.next/`, `.expo/`, `node_modules/`

**Per-workspace lint commands:**
- Web: `eslint src next.config.ts eslint.config.mjs`
- Mobile: `eslint app src`

**No Prettier config found** — formatting conventions rely on editor defaults and ESLint.

## Git & Commit Conventions

- **Conventional Commits**: `type: summary` format
  - Types observed: `feat`, `fix`, `chore`
  - Example: `feat: add basic map functionalities`
- Lowercase types and subjects.
- PR descriptions include affected workspaces and validation commands.
- Screenshots/screen recordings for UI changes.

## TypeScript Strictness

`tsconfig.base.json` enforces:
- `strict: true` — full strict mode
- `noUncheckedIndexedAccess: true` — access to `Record<K,V>` requires undefined check
- `exactOptionalPropertyTypes: true` — no `undefined` assignment to optional props

---

*Convention analysis: 2026-06-27*
