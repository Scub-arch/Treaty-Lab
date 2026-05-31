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

## Triage — axe baseline

The first axe run (CI) captured the app's accessibility baseline. The job is
**non-required** until the serious-contrast backlog below is cleared.

**Fixed in this PR:**

- `select-name` (**critical**, `/ask`) — the Project/Domain context `<select>`s
  had visible `<div>` labels but no programmatic name; given `aria-label`s.
- `aria-hidden-focus` (serious, `/dashboard`) — the slide-in `ChatPanel` aside
  was `aria-hidden` while closed but kept focusable children in the tab order;
  switched to `inert={!open}`.
- The theme menu's own a11y (radio-group keyboard pattern + initial focus,
  Label-in-Name trigger, named dialog) and the `/60` top-bar contrast.

**Deferred (follow-up — the audit stays non-required until done):**

- `color-contrast` (serious) on most routes. The bulk is **hard-coded** per
  component colours (`text-zinc-500`, `text-amber-300/80`, etc.) that bypass the
  theme tokens, plus the default theme's intentionally dim `--muted-foreground`.
  The terminal aesthetic is the deliberate default (per UI-003), so the
  remediation is the **High-contrast theme** for users who need AA, with a
  separate pass to lift the hard-coded default-theme colours. This is a broad,
  cross-file change kept out of this PR.
