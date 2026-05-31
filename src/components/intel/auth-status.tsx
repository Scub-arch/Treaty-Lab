"use client";

import { useEffect, useState } from "react";
import { LogIn, LogOut } from "lucide-react";

type SessionUser = { email: string; name: string | null };

/**
 * Client-side auth status for the TopBar. Fetches /api/auth/session on mount so
 * the surrounding layout + pages can stay statically rendered (no cookies() in
 * the server tree). Shows the signed-in email + a sign-out form, or a sign-in link.
 */
export function AuthStatus() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { user: SessionUser | null }) => {
        if (active) {
          setUser(d.user);
          setLoaded(true);
        }
      })
      .catch(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, []);

  if (!loaded) return null;

  if (!user) {
    return (
      <a
        href="/login"
        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Sign in</span>
      </a>
    );
  }

  return (
    <form action="/api/auth/signout" method="post" className="flex items-center gap-2">
      <span className="text-muted-foreground/80 max-w-[160px] truncate" title={user.email}>
        {user.email}
      </span>
      <button
        type="submit"
        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Sign out</span>
      </button>
    </form>
  );
}
