# Testing Patterns

**Analysis Date:** 2026-06-27

## Test Framework

**Primary:** Jest `^29.7.0` — used in all four workspaces.
**E2E/Integration:** Playwright `^1.59.1` — used in `apps/web` only.

### Workspace-Specific Config

| Workspace | Config File | Preset | Test Environment |
|-----------|------------|--------|-----------------|
| `apps/web` | `jest.config.js` | `next/jest` | `jsdom` |
| `apps/mobile` | `jest.config.cjs` | `jest-expo` | React Native (default) |
| `packages/api` | `jest.config.cjs` | `ts-jest/presets/default-esm` | `node` |
| `packages/shared` | `jest.config.cjs` | `ts-jest/presets/default-esm` | `node` |

### Run Commands

```bash
# All workspaces (via Turbo)
pnpm test

# Single workspace
pnpm --filter @glide/web test
pnpm --filter @glide/mobile test
pnpm --filter @glide/shared test
pnpm --filter @glide/api test

# Watch mode (via Jest directly)
pnpm --filter @glide/web test -- --watch

# Web E2E / integration
pnpm --filter @glide/web test:e2e
pnpm --filter @glide/web test:integration
```

## Test File Organization

### Location Pattern
- **Apps**: Tests co-located beside source files in `src/`.
  - `src/components/admin-shell.test.tsx` beside `src/components/admin-shell.tsx`
  - `src/features/map/map-screen.test.tsx` beside `src/features/map/map-screen.tsx`
  - `src/lib/auth.test.ts` beside `src/lib/auth.ts`
- **Packages**: Tests in a separate `tests/` directory.
  - `packages/shared/tests/formatters.test.ts`
  - `packages/api/tests/mock-services.test.ts`
- **Web E2E/Integration**: `apps/web/tests/e2e/` and `apps/web/tests/integration/`.

### Naming
- Jest: `*.test.ts` or `*.test.tsx`
- Playwright: `*.spec.ts`

### Jest Config Details

**`jest.config.js` (web):**
```javascript
module.exports = createJestConfig({
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@glide/api$": "<rootDir>/../../packages/api/src/index.ts",
    "^@glide/shared$": "<rootDir>/../../packages/shared/src/index.ts"
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: ["<rootDir>/src/**/*.test.[jt]s?(x)"],
  testEnvironment: "jsdom"
});
```

**`jest.config.cjs` (mobile):**
```javascript
module.exports = {
  preset: "jest-expo",
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@glide/api$": "<rootDir>/../../packages/api/src/index.ts",
    "^@glide/shared$": "<rootDir>/../../packages/shared/src/index.ts",
    "^react$": "<rootDir>/../../node_modules/react-native/node_modules/react",
    "^react/jsx-runtime$": "<rootDir>/../../node_modules/react-native/node_modules/react/jsx-runtime.js"
  }
};
```

**`jest.config.cjs` (packages):**
```javascript
module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  extensionsToTreatAsEsm: [".ts"]
};
```

## Test Coverage Areas

### By Workspace

**`packages/shared` (3 test files):**
- `formatters.test.ts` — `formatCurrency`, `formatDistanceKm`, `formatDuration`
- `fare.test.ts` — `calculateBillableMinutes`, `calculateRideRevenue`
- Pure utility functions, no mocks needed.

**`packages/api` (1 test file):**
- `mock-services.test.ts` — verifies mock data shape, HTTP service factory
- Uses `jest.fn()` for fetch mocking in HTTP service tests.

**`apps/web` (~15+ test files):**
- **Components**: `admin-shell.test.tsx`, `admin-nav.test.tsx`, `user-management-table.test.tsx`, `bicycle-management.test.tsx`
- **Auth**: `auth.test.ts`, `supabase/server.test.ts`, `supabase/config.test.ts`
- **Forms**: `login-form.test.tsx`, `login-form-hooks.test.tsx`, `user-update-form-state.test.ts`
- **Validation**: `validation.test.ts`
- **Pages**: `(admin)/page.test.tsx`
- **API routes**: `api/bikes/[bikeId]/status/route.test.ts`
- **E2E**: `tests/e2e/login.spec.ts`, `tests/integration/public-routing.spec.ts`

**`apps/mobile` (~15+ test files):**
- **Screens**: `map-screen.test.tsx`, `wallet-screen.test.tsx`, `login-screen.test.tsx`, `signup-screen.test.tsx`, `profile-screen.test.tsx`, `active-ride-screen.test.tsx`, `ride-summary-screen.test.tsx`, `ride-history-detail-screen.test.tsx`, `unlock-screen.test.tsx`
- **Components**: `primary-button.test.tsx`, `auth-gate.test.tsx`
- **Services**: `bike-service.test.ts`, `bike-status-service.test.ts`, `ride-history-service.test.ts`, `wallet-service.test.ts`
- **Utilities**: `marker-colors.test.ts`, `bank-logo-map.test.ts`, `live-ride-tracker.test.ts`, `tab-bar-style.test.ts`
- **Providers**: `auth-provider.test.tsx`

## Test Patterns

### Structure
- Top-level `describe("ModuleName")` block.
- Nested `describe("functionName")` or `describe("scenario")` blocks.
- Individual cases with `it("does X when Y", ...)`.
- `beforeEach` for common mock setup; `afterEach` for cleanup (`jest.clearAllMocks()`).

### Pure Unit Tests (packages/shared)
```typescript
describe("formatters", () => {
  it("formats currency in THB", () => {
    expect(formatCurrency(4.25)).toBe("฿4.25");
  });

  it("formats distances with one decimal place", () => {
    expect(formatDistanceKm(3.14)).toBe("3.1 km");
  });
});
```

### Component Tests (web - @testing-library/react)
```typescript
import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("next/link", () => {
  return function MockLink({ children, href }: { children: ReactNode; href: string }) {
    return <a href={href}>{children}</a>;
  };
});

describe("AdminNav", () => {
  it("renders Home as the first tab", () => {
    render(<AdminNav />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Home", "Dashboard", "Users", "Bicycles"]);
  });
});
```

### Component Tests (mobile - @testing-library/react-native)
```typescript
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

jest.mock("expo-router", () => ({ useRouter: jest.fn() }));

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useRouter).mockReturnValue({ push: jest.fn() } as never);
    jest.mocked(useAuth).mockReturnValue({ authError: null, configError: null, signIn } as never);
  });

  it("submits email/password to Supabase auth", async () => {
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("Enter your email"), "Alex@RideGlide.App ");
    fireEvent.press(screen.getByText("Sign In"));
    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith("alex@rideglide.app", "secret-pass");
    });
  });
});
```

## Mocking Strategy

### Framework
Native `jest.mock()` and `jest.fn()` — no additional mocking library used.

### Patterns

**1. Module-level mocks** (for external dependencies):
```typescript
jest.mock("@supabase/ssr", () => ({
  createServerClient: jest.fn()
}));
jest.mock("next/headers", () => ({
  cookies: jest.fn()
}));
```

**2. Inline mock implementations** (for components/libraries):
```typescript
jest.mock("recharts", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const MockChartComponent = ({ children }: { readonly children?: ReactNode }) =>
    React.createElement("div", null, children);
  return { Bar: MockChartComponent, BarChart: MockChartComponent, /* ... */ };
});
```

**3. Helper factories** (for complex mock returns):
```typescript
function createAuthClient(overrides?: { getUserResult?: ...; profileResult?: ... }) {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ ... }) },
    from: jest.fn(() => ({ select: jest.fn(() => ({ eq: jest.fn(() => ({ maybeSingle })) })) }))
  };
}
```

**4. Typed mocks with `jest.mocked()`**:
```typescript
const listNearby = jest.mocked(configuredBikeService.listNearby);
const createClientMock = jest.mocked(createClient);
```

### What to Mock
- External services: Supabase, Expo Location, `expo-router`, `next/navigation`, `react-native-safe-area-context`, `@supabase/ssr`.
- Heavy chart/visualization libraries: `recharts`.
- Workspace packages: `@glide/api`, `@glide/shared` (partially mocked for failure tests).
- Internal service wrappers: `bike-service`, `wallet-service`.

### What NOT to Mock
- Pure utility functions in `packages/shared` (tested directly).
- React and React Native core modules (reality-checked via `jest.requireActual`).

## Coverage

**Not explicitly enforced** — no `coverageThreshold` in any jest config. Coverage output directory (`coverage/`) is gitignored.

## Async Testing

```typescript
// Using waitFor
await waitFor(() => {
  expect(screen.getByText("No bikes nearby right now")).toBeTruthy();
});

// Using async assertions
await expect(getAuthContext()).resolves.toBeNull();
await expect(getAuthContext()).rejects.toThrow("Something else failed.");

// Using act for state changes
act(() => {
  pressMarker?.("G-104", "available", null);
});
```

## Timer Testing

```typescript
it("polls for nearby bikes while focused", async () => {
  jest.useFakeTimers();
  await renderScreen();
  await act(async () => {
    jest.advanceTimersByTime(MAP_POLL_INTERVAL_MS);
  });
  await waitFor(() => {
    expect(listNearby).toHaveBeenCalledTimes(2);
  });
  jest.useRealTimers();
});
```

## Isolated Module Testing

For testing module-level configuration branches without cross-test contamination:
```typescript
await jest.isolateModulesAsync(async () => {
  jest.doMock("./supabase/config", () => ({ hasSupabaseConfig: false }));
  const authModule = await import("./auth");
  await expect(authModule.getAuthContext()).resolves.toBeNull();
});
```

## Playwright E2E (web only)

**Config:** `apps/web/playwright.config.ts`
- Browser: Chromium only (Desktop Chrome)
- Runs against a dev server (`next start`) on port 3100
- Retries: 2 on CI, 0 locally
- Video/screenshot: captured on failure
- Trace: on first retry

```typescript
import { test } from "@playwright/test";
import { expectLoginScreen } from "../helpers/auth";

test.describe("login page", () => {
  test("renders the admin sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expectLoginScreen(page);
  });
});
```

## Type Checking

All workspaces run `tsc --noEmit` as a separate `typecheck` step:
```bash
pnpm typecheck  # turbo run typecheck
```

This is a distinct step from testing — type errors are caught before test execution.

---

*Testing analysis: 2026-06-27*
