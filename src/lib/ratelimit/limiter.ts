/**
 * SEC-002 rate limiter.
 *
 * Fixed-window counter behind a small interface. The default backend is
 * in-memory (per-process) — the documented fallback when no shared store is
 * configured. When AI-002 introduces Upstash Redis, implement `RateLimiter`
 * against it and swap `getRateLimiter()` so limits are global across instances.
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Requests left in the current window (0 when blocked). */
  remaining: number;
  /** Seconds until the window resets (for the Retry-After header). */
  retryAfterSec: number;
}

export interface RateLimiter {
  /** Consume one unit against `key`; allow up to `max` per `windowMs`. */
  hit(key: string, max: number, windowMs: number): RateLimitResult;
}

type Bucket = { count: number; resetAt: number };

class InMemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, Bucket>();

  hit(key: string, max: number, windowMs: number): RateLimitResult {
    const now = Date.now();

    // Opportunistic cleanup so the map cannot grow unbounded.
    if (this.buckets.size > 5000) {
      for (const [k, b] of this.buckets) if (b.resetAt <= now) this.buckets.delete(k);
    }

    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      this.buckets.set(key, bucket);
    }

    bucket.count += 1;
    const allowed = bucket.count <= max;
    return {
      allowed,
      remaining: Math.max(0, max - bucket.count),
      retryAfterSec: allowed ? 0 : Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
}

// Module-level singleton (survives hot-reload via globalThis in dev).
const globalForLimiter = globalThis as unknown as { __tlRateLimiter?: RateLimiter };
const limiter: RateLimiter = globalForLimiter.__tlRateLimiter ?? new InMemoryRateLimiter();
if (process.env.NODE_ENV !== "production") globalForLimiter.__tlRateLimiter = limiter;

export function getRateLimiter(): RateLimiter {
  return limiter;
}
