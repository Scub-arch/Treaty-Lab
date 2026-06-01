/**
 * SEC-001 auth — public server-side API.
 *
 * Server-only (imports the Prisma client + next/headers). Never import this
 * from a "use client" module.
 *
 *   const session = await auth();          // SessionUser | null  (API routes)
 *   const session = await requireAuth();   // SessionUser | redirect (server pages)
 */

import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "./session";

/** Current session (user + org) from the cookie, or null. */
export async function auth(): Promise<SessionUser | null> {
  return getSession();
}

/** Current session, or redirect to /login?next=… when unauthenticated. */
export async function requireAuth(nextPath?: string): Promise<SessionUser> {
  const session = await auth();
  if (!session) {
    redirect(`/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  }
  return session;
}

export { createSession, destroySession, getSession, SESSION_COOKIE_NAME } from "./session";
export { createMagicLink, consumeMagicLink } from "./magic-link";
export { findOrCreateUser } from "./users";
export { getEmailSender, exposeMagicLinkInResponse } from "./email";
export { isAdminSession, isAdminEmail } from "./admin";
export type { SessionUser } from "./session";
export type { IssuedMagicLink } from "./magic-link";
