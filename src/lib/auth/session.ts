/**
 * Database-backed sessions (SEC-001). 30-day, hashed at rest, httpOnly cookie.
 *
 * The cookie holds the raw token; the Session row stores only its SHA-256 hash.
 * Validation hashes the cookie value and looks the row up by hash. Server-only
 * (uses next/headers cookies() + Prisma over better-sqlite3).
 */

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "./tokens";

export const SESSION_COOKIE_NAME = "tl_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface SessionUser {
  userId: string;
  orgId: string;
  email: string;
  name: string | null;
}

/** Create a session for a user+org and set the session cookie. */
export async function createSession(userId: string, orgId: string): Promise<void> {
  const rawToken = generateToken();
  const sessionToken = hashToken(rawToken);
  const expires = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({ data: { sessionToken, userId, orgId, expires } });

  const jar = await cookies();
  jar.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

/** Resolve the current session from the cookie, or null. Expired rows are swept. */
export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;

  const sessionToken = hashToken(raw);
  const row = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: { select: { email: true, name: true } } },
  });
  if (!row) return null;

  if (row.expires.getTime() < Date.now()) {
    await prisma.session.delete({ where: { sessionToken } }).catch(() => {});
    return null;
  }

  return { userId: row.userId, orgId: row.orgId, email: row.user.email, name: row.user.name };
}

/** Destroy the current session (DB row + cookie). Safe to call when signed out. */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE_NAME)?.value;
  if (raw) {
    await prisma.session.delete({ where: { sessionToken: hashToken(raw) } }).catch(() => {});
  }
  jar.delete(SESSION_COOKIE_NAME);
}
