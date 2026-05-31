/**
 * SEC-002 chat rate limiting — public API.
 *
 * Two windows, both must pass: per-user (default 10/min) and per-org
 * (default 100/hour). Per-org overrides come from the Quota table (cached).
 */

import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { getRateLimiter, type RateLimitResult } from "./limiter";

const DEFAULT_USER_PER_MINUTE = 10;
const DEFAULT_ORG_PER_HOUR = 100;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * 60_000;

const QUOTA_CACHE_TTL_MS = 60_000;
type CachedQuota = { userPerMinute: number; orgPerHour: number; at: number };
const quotaCache = new Map<string, CachedQuota>();

async function resolveLimits(
  orgId: string,
): Promise<{ userPerMinute: number; orgPerHour: number }> {
  const cached = quotaCache.get(orgId);
  if (cached && Date.now() - cached.at < QUOTA_CACHE_TTL_MS) {
    return { userPerMinute: cached.userPerMinute, orgPerHour: cached.orgPerHour };
  }
  const q = await prisma.quota.findUnique({ where: { orgId } });
  const limits = {
    userPerMinute: q?.userPerMinute ?? DEFAULT_USER_PER_MINUTE,
    orgPerHour: q?.orgPerHour ?? DEFAULT_ORG_PER_HOUR,
  };
  quotaCache.set(orgId, { ...limits, at: Date.now() });
  return limits;
}

export interface RateLimitDecision extends RateLimitResult {
  scope: "user" | "org";
  limit: number;
}

/**
 * Enforce the chat rate limit for a session. Returns a `RateLimitDecision` to
 * reject (429) when a window is exceeded, or null when the request may proceed.
 */
export async function checkChatRateLimit(session: SessionUser): Promise<RateLimitDecision | null> {
  const { userPerMinute, orgPerHour } = await resolveLimits(session.orgId);
  const limiter = getRateLimiter();

  const user = limiter.hit(`chat:user:${session.userId}`, userPerMinute, MINUTE_MS);
  if (!user.allowed) return { ...user, scope: "user", limit: userPerMinute };

  const org = limiter.hit(`chat:org:${session.orgId}`, orgPerHour, HOUR_MS);
  if (!org.allowed) return { ...org, scope: "org", limit: orgPerHour };

  return null;
}

/** Build the 429 JSON body + headers for a rejected request. */
export function rateLimitResponseInit(decision: RateLimitDecision): {
  body: { error: string; scope: string; retryAfterSec: number };
  headers: Record<string, string>;
} {
  const noun = decision.scope === "user" ? "you" : "your organization";
  return {
    body: {
      error: `Rate limit reached for ${noun}. Try again in ${decision.retryAfterSec}s.`,
      scope: decision.scope,
      retryAfterSec: decision.retryAfterSec,
    },
    headers: {
      "Retry-After": String(decision.retryAfterSec),
      "X-RateLimit-Limit": String(decision.limit),
      "X-RateLimit-Remaining": String(decision.remaining),
    },
  };
}
