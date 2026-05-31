import { defineConfig, devices } from "@playwright/test";

// UI-003 — Playwright config for the axe-core accessibility smoke. A standalone
// tsx pre-step (tests/seed-auth-session.ts, run in CI before this) mints a real
// session and writes the storageState consumed below, so the SEC-001-gated pages
// are crawled signed in rather than redirected to /login. (The session is seeded
// outside Playwright's loader because importing the generated Prisma client
// through it trips "exports is not defined in ES module scope".)
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
    storageState: "tests/.auth/state.json",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start",
    url: `http://${HOST}:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
