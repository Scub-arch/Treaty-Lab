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
CSS animation. The `cobe` globe on the Command Center is a canvas animation — a
follow-up should pass it a `prefers-reduced-motion` flag to stop the spin.

## Conformance target & follow-up

The target is **WCAG 2.1 AA**. Still to do (deferred from UI-003 as heavier infra):

- **Automated axe-core audit in CI.** Add a Playwright smoke test running
  `@axe-core/playwright` against the key routes and fail CI on any
  serious/critical violation. This pulls Playwright + a browser into CI and is
  best landed as its own change.
- Triage and fix violations surfaced by that audit.
- `cobe` reduced-motion flag (above).

## Enforced CSP note

The Content-Security-Policy currently ships **report-only** (see `SECURITY.md`);
the inline theme script relies on `script-src 'unsafe-inline'`. When the CSP is
enforced, that script needs a nonce via the Next.js nonce flow.
