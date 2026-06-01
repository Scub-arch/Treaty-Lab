/**
 * POST /api/auth/signin — request a magic sign-in link.
 *
 * Body: { email: string, next?: string }
 * Always responds 200 with a generic message (no account enumeration). In dev,
 * also returns `devUrl` so you can sign in without real email.
 */

import { NextResponse } from "next/server";
import { createMagicLink, getEmailSender, exposeMagicLinkInResponse } from "@/lib/auth";
import { logger } from "@/lib/logger";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function appOrigin(req: Request): string {
  return process.env.APP_URL ?? new URL(req.url).origin;
}

/** Only allow relative, single-slash paths as the post-login destination. */
function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function POST(req: Request) {
  let body: { email?: string; next?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }
  const next = safeNext(body.next);

  const { rawToken } = await createMagicLink(email);
  const url = new URL("/api/auth/callback", appOrigin(req));
  url.searchParams.set("identifier", email);
  url.searchParams.set("token", rawToken);
  url.searchParams.set("next", next);

  try {
    await getEmailSender().sendMagicLink({ to: email, url: url.toString() });
  } catch (err) {
    // Surface a generic failure (no provider detail, no account-existence
    // signal); the prod sender throws on a non-2xx from the email provider.
    logger.error(
      { event: "signin.email_send_failed", err: err instanceof Error ? err.message : String(err) },
      "magic-link email send failed",
    );
    return NextResponse.json(
      { error: "Could not send the sign-in email right now. Please try again shortly." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Check your email for a sign-in link.",
    ...(exposeMagicLinkInResponse() ? { devUrl: url.toString() } : {}),
  });
}
