/**
 * Auth constants with no server-only dependencies, so they can be imported from
 * the proxy without pulling in the Prisma client / next/headers.
 */

export const SESSION_COOKIE_NAME = "tl_session";

/**
 * Production-like unless NODE_ENV is explicitly "development" or "test". An unset
 * or unexpected NODE_ENV is treated as production, so the auth security gates fail
 * CLOSED rather than open. Evaluated per-call (NODE_ENV can be toggled in tests).
 */
export function isProductionLike(): boolean {
  const env = process.env.NODE_ENV;
  return env !== "development" && env !== "test";
}
