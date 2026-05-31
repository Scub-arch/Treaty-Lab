/**
 * SEC-001 route protection.
 *
 * Next 16 renamed `middleware` → `proxy` (Node.js runtime). This proxy gates
 * page navigation: any path other than `/`, `/login`, `/api/auth/*`, and static
 * assets requires a session cookie, else it redirects to `/login?next=…`.
 *
 * It does a lightweight cookie-PRESENCE check only (no DB) — fast, and it runs
 * on every page request. Real validation (hash lookup, expiry) happens in the
 * route handlers / server pages via `auth()`; API routes return a JSON 401
 * rather than an HTML redirect, so the proxy never redirects `/api/*`.
 */

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const PUBLIC_PATHS = new Set(["/", "/login"]);

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // API routes enforce auth themselves (JSON 401) — never redirect them.
  if (pathname.startsWith("/api/")) return NextResponse.next();
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  if (req.cookies.get(SESSION_COOKIE_NAME)?.value) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and static asset files.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)",
  ],
};
