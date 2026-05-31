# Accessibility

## Themes (UI-003)

A **View** menu in the TopBar (a native `<select>` — keyboard-accessible by
default) switches between three themes, persisted via the `tl_theme` cookie and
applied before paint by a small inline script in the layout (no flash):

| Theme             | `<html>` class  | Notes                                                                                                                                                                     |
| ----------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Default**       | `dark`          | The institutional dark terminal.                                                                                                                                          |
| **High-Contrast** | `high-contrast` | Pure black/white base — foreground:background is **21:1** (well above WCAG AAA 7:1); secondary text stays ≥7:1. Base font bumped to ~17px. Decorative motion is disabled. |
| **Light**         | _(none)_        | The existing light token set (`:root`); a legitimate alternative, not just dark inverted.                                                                                 |

Tailwind's `dark:` variant applies in both `dark` and `high-contrast` (see
`@custom-variant dark` in `globals.css`), so dark-mode component styling carries
into High-Contrast.

Verified in-browser: all three switch correctly, persist across reload, and the
inline script restores the saved theme with no flash; no console/hydration errors.

## Reduced motion

`globals.css` honours `@media (prefers-reduced-motion: reduce)` globally
(animations/transitions reduced to ~0ms) and force-calms the High-Contrast theme
regardless of OS setting. This covers the pulsing "LIVE" indicator and similar
CSS animation. The `cobe` globe on the Command Center is a canvas animation, so
it checks `matchMedia("(prefers-reduced-motion: reduce)")` directly and **stops
auto-rotating** (it still renders and stays draggable); its canvas also carries
`role="img"` + an `aria-label`.

## Automated axe-core audit (CI)

The target is **WCAG 2.1 AA**. An `@axe-core/playwright` smoke (`npm run test:a11y`)
crawls every route against the WCAG 2.1 A/AA rule set and fails on any
`serious`/`critical` violation; `moderate`/`minor` findings are logged for triage.

- **Auth fixture.** Most routes are gated by SEC-001, so the crawl signs in first.
  a standalone `tsx` step (`tests/seed-auth-session.ts`, run in CI before the
  crawl) mints a real `Session` row exactly as `createSession()` does — stores
  `sha256(raw)`, hands the raw token out as the `tl_session` cookie — and saves it
  as Playwright `storageState`, so the crawl hits the real pages instead of
  `/login`. It runs in Node (not through Playwright's loader, which can't import
  the generated Prisma client), so the auth wiring is verifiable with `tsx`.
- **CI.** Runs as a separate, **non-required** workflow (`.github/workflows/a11y.yml`)
  so it surfaces violations on every PR without blocking the required `check`
  gate. Promote it to required once the contrast triage below is clean.
- **Triage.** The first run's serious findings are dominated by `color-contrast`
  from hard-coded per-component colours (`text-zinc-500`, `text-amber-300/80`, …)
  and the intentionally dim default-theme muted text; the High-contrast theme
  already clears the token-based ones. Lifting the hard-coded default-theme
  colours is the remaining cross-file follow-up before the audit can gate.

## Enforced CSP note

The Content-Security-Policy currently ships **report-only** (see `SECURITY.md`);
the inline theme script relies on `script-src 'unsafe-inline'`. When the CSP is
enforced, that script needs a nonce via the Next.js nonce flow.
