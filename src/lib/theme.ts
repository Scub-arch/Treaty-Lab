// UI-003 — theme model shared by the server layout (pre-paint script) and the
// client View menu. Three themes; the terminal-dark default stays the default.
export const THEME_COOKIE = "theme";

export type Theme = "default" | "high-contrast" | "light";

export const THEMES: { id: Theme; label: string; hint: string }[] = [
  { id: "default", label: "Default", hint: "Terminal dark" },
  { id: "high-contrast", label: "High contrast", hint: "AAA contrast · larger text" },
  { id: "light", label: "Light", hint: "Daylight palette" },
];

/** Map a theme to the class list applied to <html>. */
export function themeClass(theme: Theme): string {
  switch (theme) {
    case "light":
      return "";
    case "high-contrast":
      return "dark theme-hc";
    default:
      return "dark";
  }
}

/** Narrow an arbitrary cookie value to a Theme (defaults to "default"). */
export function asTheme(value: string | undefined | null): Theme {
  return value === "light" || value === "high-contrast" ? value : "default";
}

/**
 * Pre-paint script (stringified) injected as the first <body> child. It reads
 * the theme cookie and sets the <html> class before the page paints, so a
 * non-default saved theme never flashes — and it avoids a server-side cookies()
 * read that would opt the whole app out of static rendering. CSP allows it
 * (report-only + 'unsafe-inline'); see next.config.ts. When the documented
 * SEC-003 follow-up hardens CSP to a nonce (dropping 'unsafe-inline'), this
 * script must be given that nonce along with Next.js' own inline scripts.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);var t=m?decodeURIComponent(m[1]):"default";document.documentElement.className=t==="light"?"":t==="high-contrast"?"dark theme-hc":"dark";}catch(e){}})();`;
