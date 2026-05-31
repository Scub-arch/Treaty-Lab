/**
 * GET /api/auth/callback?identifier=&token=&next= — consume a magic link.
 *
 * On success: bootstrap/resolve the user + org, create a session, set the
 * cookie, and redirect to `next`. On failure: redirect to /login with an error.
 */

import { NextResponse } from "next/server";
import { consumeMagicLink, findOrCreateUser, createSession } from "@/lib/auth";

function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const identifier = url.searchParams.get("identifier") ?? "";
  const token = url.searchParams.get("token") ?? "";
  const next = safeNext(url.searchParams.get("next"));

  const email = await consumeMagicLink(identifier, token);
  if (!email) {
    return NextResponse.redirect(new URL("/login?error=invalid-or-expired", url.origin));
  }

  const { userId, orgId } = await findOrCreateUser(email);
  await createSession(userId, orgId);

  return NextResponse.redirect(new URL(next, url.origin));
}
