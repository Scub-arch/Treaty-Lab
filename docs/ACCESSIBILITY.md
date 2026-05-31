# Accessibility (UI-003)

Treaty-Lab targets **WCAG 2.1 AA**. The terminal aesthetic stays the default,
but it is no longer the only option, and motion is opt-out.

## Themes

A **View** menu in the top bar switches between three themes. The choice is
saved in a year-long `theme` cookie and re-applied before first paint by a tiny
inline script in `src/app/layout.tsx`, so a non-default theme never flashes and
the pages stay statically rendered (no server-side `cookies()` read).

| Theme              | `<html>` class   | Notes                                                            |
| ------------------ | ---------------- | --------------------------------------------------------------- |
| **Default**        | `dark`           | Terminal dark. The as-shipped default.                          |
| **High contrast**  | `dark theme-hc`  | ≥7:1 tokens, 18px base font, small labels floored to ~14px.     |
| **Light**          | _(none)_         | The `:root` daylight palette.                                   |

Implementation:

- Tokens live in `src/app/globals.css`. `:root` is the light palette, `.dark`
  the terminal default, and `.theme-hc` (layered on `.dark` so `dark:`
  utilities still resolve) overrides every token to a high-contrast palette and
  bumps the root font size. Because `.theme-hc` follows `.dark` in the cascade,
  its variables win.
- The theme model is shared between the server pre-paint script and the client
  menu in `src/lib/theme.ts`.
- The menu is `src/components/intel/theme-menu.tsx` — a `radiogroup` of three
  `radio` options, keyboard-operable, with `aria-checked` state.

### High-contrast theme

`--muted-foreground` rises from the default `oklch(0.708)` to `oklch(0.9)`
(~13:1 on the near-black background), so every piece of secondary text — and the
low-opacity decorative text in the default theme (see Triage below) — clears AA
comfortably. The focus ring becomes a bright amber. Root font size is 18px and
the smallest absolute-px labels (`text-[10px]` / `text-[11px]`) are floored to
~14px.

## Reduced motion

`@media (prefers-reduced-motion: reduce)` in `globals.css` neutralises all CSS
animation and transition: the `animate-pulse` LIVE dot, the pulsing `/ask`
prompt arrow, accordion/popover/skeleton transitions, and spinners. The cobe
globe animates via `requestAnimationFrame`, so it is paused separately in
`src/components/intel/geographic-overview.tsx` (auto-rotation stops; the globe
still renders and remains draggable). The globe `<canvas>` has an `aria-label`,
and the same locations are listed textually beneath it.

## Automated audit (axe-core)

`npm run test:a11y` builds and serves the app, then runs **axe-core** (via
Playwright) against the WCAG 2.1 A/AA rule set on every route, failing on any
`serious` or `critical` violation; `moderate`/`minor` findings are logged for
triage. The crawl seeds a dummy `tl_session` cookie because the SEC-001 proxy
gates page navigation on cookie presence.

CI runs this as a **separate, non-required** workflow (`.github/workflows/a11y.yml`)
so it surfaces violations on every PR without blocking the required `check`
gate. Promote it to a required check once the triage below is clean.

> Note: the axe smoke is validated in CI (Linux). It is not run on the author's
> Windows box, where Smart App Control blocks the bundled Chromium.

## Triage — known default-theme items

The default terminal theme uses some intentionally dim, low-opacity decorative
text. These are **resolved in the High-contrast theme** and are tracked as a
follow-up for the default theme rather than fixed here (to keep this PR off
shared dashboard files):

- `text-muted-foreground/60` em-dashes / counts in `components/dashboard/treaties-table.tsx`.
- `/60` chevron and list-marker decoration in `app/sources/page.tsx`, `app/evidence/[slug]/page.tsx`.
- The `text-muted-foreground/50` 404 numeral (`app/not-found.tsx`) — large display text, ≥3:1.
- `placeholder:text-muted-foreground/60` in the chat composer (placeholders are exempt from the AA text-contrast rule).

Fixed here: the `text-muted-foreground/60` "(coming soon)" label in the top bar.
