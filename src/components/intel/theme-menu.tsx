"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

type Theme = "dark" | "light" | "high-contrast";

const THEMES: { value: Theme; label: string }[] = [
  { value: "dark", label: "Default" },
  { value: "high-contrast", label: "High-Contrast" },
  { value: "light", label: "Light" },
];

function classForTheme(t: Theme): string {
  return t === "light" ? "" : t === "high-contrast" ? "high-contrast" : "dark";
}

function applyTheme(t: Theme) {
  document.documentElement.className = classForTheme(t);
  document.cookie = `tl_theme=${t}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * UI-003 "View" menu. A native <select> — keyboard-accessible by default —
 * switches between Default / High-Contrast / Light and persists via the
 * tl_theme cookie (read on the server by the no-flash script in the layout).
 */
export function ThemeMenu() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const m = document.cookie.match(/(?:^|; )tl_theme=([^;]+)/);
    if (m) setTheme(decodeURIComponent(m[1]) as Theme);
  }, []);

  return (
    <label className="flex items-center gap-1.5" title="View theme">
      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
      <span className="sr-only">View theme</span>
      <select
        value={theme}
        onChange={(e) => {
          const t = e.target.value as Theme;
          setTheme(t);
          applyTheme(t);
        }}
        className="bg-transparent text-[11px] text-muted-foreground hover:text-foreground focus:text-foreground outline-none cursor-pointer"
        aria-label="View theme"
      >
        {THEMES.map((t) => (
          <option key={t.value} value={t.value} className="bg-background text-foreground">
            {t.label}
          </option>
        ))}
      </select>
    </label>
  );
}
