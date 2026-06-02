/**
 * POST /api/auth/signin — request a magic sign-in link.
 *
 * Body: { email: string, next?: string }
 * Always responds 200 with a generic message (no account enumeration). In dev,
 * also returns `devUrl` so you can sign in without real email.
 *
 * Security: magic-link URLs are built from a trusted configured origin
 * (`APP_URL`), never from the request Host, and requests are throttled.
 */

import { NextResponse } from "next/server";
import { createMagicLink, getEmailSender, exposeMagicLinkInResponse } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getRateLimiter } from "@/lib/ratelimit/limiter";
import { isProductionLike } from "@/lib/auth/constants";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Throttle sign-in requests (in-memory, per-process — the SEC-002 limiter).
const SIGNIN_PER_EMAIL = 5;
const SIGNIN_PER_IP = 20;
const SIGNIN_WINDOW_MS = 10 * 60_000;

/**
 * The trusted origin used to build magic-link URLs.
 *
 * In production `APP_URL` is REQUIRED and must be a valid HTTPS URL — the
 * origin is never derived from the request, because a forwarded Host header is
 * attacker-controllable and could point a sign-in link at an untrusted domain.
 * In development/test, fall back to the request origin so local login works.
 * Throws when misconfigured in production (the caller fails closed).
 */
function appOrigin(req: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    let parsed: URL;
    try {
      parsed = new URL(configured);
    } catch {
      throw new Error("APP_URL is not a valid absolute URL.");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("APP_URL must use http or https.");
    }
    // Production-like: require HTTPS — an http origin would carry the token in
    // cleartext and the Secure session cookie would not round-trip.
    if (isProductionLike() && parsed.protocol !== "https:") {
      throw new Error("APP_URL must use https in production.");
    }
    return parsed.origin;
  }
  if (isProductionLike()) {
    throw new Error("APP_URL must be configured in production to issue sign-in links.");
  }
  return new URL(req.url).origin;
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  return xff ? xff.split(",")[0]?.trim() || "unknown" : "unknown";
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

  // Limit sign-in email bombing (per email + per source IP). Generic 429 — no
  // account-existence signal.
  const limiter = getRateLimiter();
  const byEmail = limiter.hit(`signin:email:${email}`, SIGNIN_PER_EMAIL, SIGNIN_WINDOW_MS);
  const byIp = limiter.hit(`signin:ip:${clientIp(req)}`, SIGNIN_PER_IP, SIGNIN_WINDOW_MS);
  if (!byEmail.allowed || !byIp.allowed) {
    const retryAfterSec = Math.max(byEmail.retryAfterSec, byIp.retryAfterSec);
    return NextResponse.json(
      { error: "Too many sign-in requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
    );
  }

  // Resolve the trusted origin BEFORE issuing a token; fail closed on prod misconfig.
  let origin: string;
  try {
    origin = appOrigin(req);
  } catch (err) {
    logger.error(
      {
        event: "signin.origin_misconfigured",
        err: err instanceof Error ? err.message : String(err),
      },
      "magic-link origin misconfigured",
    );
    return NextResponse.json({ error: "Sign-in is temporarily unavailable." }, { status: 500 });
  }

  const next = safeNext(body.next);

  const { rawToken } = await createMagicLink(email);
  const url = new URL("/api/auth/callback", origin);
  url.searchParams.set("identifier", email);
  url.searchParams.set("token", rawToken);
  url.searchParams.set("next", next);

  try {
    await getEmailSender().sendMagicLink({ to: email, url: url.toString() });
  } catch (err) {
    // Surface a generic failure (no provider detail, no account-existence
    // signal); the prod sender throws on a non-2xx from the email provider or
    // when no production sender is configured.
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
