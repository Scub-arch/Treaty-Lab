import { defineConfig, devices } from "@playwright/test";

// UI-003 — Playwright config for the axe-core accessibility smoke test.
// Builds + serves the production app and crawls every route. The SEC-001 proxy
// gates page navigation on the PRESENCE of a session cookie (no page calls
// auth() itself), so we seed a dummy `tl_session` cookie to reach real pages.
const PORT = 3000;
const HOST = "127.0.0.1";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    storageState: {
      cookies: [
        {
          name: "tl_session",
          value: "a11y-smoke",
          domain: HOST,
          path: "/",
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start",
    url: `http://${HOST}:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
