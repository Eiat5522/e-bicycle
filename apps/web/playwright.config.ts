import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ],
  ...(isCI ? { workers: 1 } : {}),
  ...(!process.env.PLAYWRIGHT_BASE_URL
    ? {
        webServer: {
          command: `pnpm build && pnpm exec next start --hostname 127.0.0.1 --port ${port}`,
          cwd: __dirname,
          url: baseURL,
          reuseExistingServer: !isCI,
          timeout: 120_000
        }
      }
    : {})
});
