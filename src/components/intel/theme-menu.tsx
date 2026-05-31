"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, Contrast, Monitor, Sun } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { asTheme, THEME_COOKIE, THEMES, themeClass, type Theme } from "@/lib/theme";

const ICON: Record<Theme, typeof Monitor> = {
  default: Monitor,
  "high-contrast": Contrast,
  light: Sun,
};

function readThemeCookie(): Theme {
  if (typeof document === "undefined") return "default";
  const m = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE}=([^;]*)`));
  return asTheme(m ? decodeURIComponent(m[1]) : null);
}

// UI-003 — "View" menu: switch between Default / High-contrast / Light. The
// selection is held in state; an effect mirrors it to the year-long cookie and
// the <html> class, so the pre-paint script in the layout re-applies it on the
// next load with no flash. Initial state reads the cookie the script already
// applied (SSR falls back to "default"; the visible trigger is theme-agnostic).
//
// The options form a proper WAI-ARIA radio group: roving tabindex (only the
// checked radio is a Tab stop) + Arrow/Home/End navigation. Because only the
// checked radio is tab-focusable, base-ui's focus manager also lands on the
// current selection — not always the first option — when the menu opens.
export function ThemeMenu() {
  const [theme, setTheme] = useState<Theme>(readThemeCookie);
  const radioRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    document.cookie = `${THEME_COOKIE}=${theme};path=/;max-age=31536000;samesite=lax`;
    document.documentElement.className = themeClass(theme);
  }, [theme]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const idx = THEMES.findIndex((t) => t.id === theme);
    let next = idx;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (idx + 1) % THEMES.length;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft")
      next = (idx - 1 + THEMES.length) % THEMES.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = THEMES.length - 1;
    else return;
    e.preventDefault();
    setTheme(THEMES[next].id);
    radioRefs.current[next]?.focus();
  }

  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors"
        aria-label="VIEW theme"
      >
        <Monitor className="w-3.5 h-3.5" aria-hidden />
        <span>VIEW</span>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-60" aria-label="Theme">
        <p className="px-1 pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Theme
        </p>
        <div
          role="radiogroup"
          aria-label="Theme"
          className="flex flex-col gap-0.5"
          onKeyDown={onKeyDown}
        >
          {THEMES.map(({ id, label, hint }, i) => {
            const Icon = ICON[id];
            const active = theme === id;
            return (
              <button
                key={id}
                ref={(el) => {
                  radioRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                onClick={() => setTheme(id)}
                className="flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Icon className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="flex flex-col">
                  <span className="text-sm text-foreground">{label}</span>
                  <span className="text-[11px] text-muted-foreground">{hint}</span>
                </span>
                {active && <Check className="ml-auto w-4 h-4 text-brand" aria-hidden />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
