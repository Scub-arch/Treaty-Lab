import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// UI-003 — accessibility smoke. For every route, run axe-core against the WCAG
// 2.1 A/AA rule set and fail on any `serious` or `critical` violation;
// `moderate`/`minor` findings are logged for triage but do not fail the run.
// The crawl is authenticated via the session minted in auth.global-setup.ts, so
// SEC-001-gated pages render rather than redirecting to /login. Routes include
// the static pages plus one representative instance of each dynamic route.
const ROUTES = [
  "/",
  "/login",
  "/ask",
  "/dashboard",
  "/treaty",
  "/water",
  "/energy",
  "/finance",
  "/projects",
  "/projects/site-c",
  "/projects/site-c/questions",
  "/evidence",
  "/evidence/undrip-2007",
  "/explainers",
  "/explainers/who-carries-the-risk",
  "/sources",
  "/archive",
  "/archive/treaty-6-1876",
  "/reports",
];

for (const route of ROUTES) {
  test(`a11y: ${route}`, async ({ page }) => {
    await page.goto(route, { waitUntil: "networkidle" });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    if (results.violations.length > 0) {
      console.log(
        `axe ${route}:\n` +
          JSON.stringify(
            results.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              nodes: v.nodes.length,
              help: v.help,
            })),
            null,
            2,
          ),
      );
    }

    expect(blocking, `serious/critical a11y violations on ${route}`).toEqual([]);
  });
}
