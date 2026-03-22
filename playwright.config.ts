import { defineConfig, devices } from "@playwright/test";

/**
 * Local: starts `npm run dev` on port 8080 automatically.
 * Production smoke: `PLAYWRIGHT_BASE_URL=https://www.travelvoo.in npx playwright test`
 */
/** Use localhost (not 127.0.0.1) so it matches `next dev` and avoids dev/cookie oddities. */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";

const useLocalWebServer =
  baseURL.includes("127.0.0.1") || baseURL.includes("localhost");

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: useLocalWebServer
    ? {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        stdout: "pipe",
        stderr: "pipe",
      }
    : undefined,
});
