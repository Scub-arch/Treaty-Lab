/**
 * Auth constants with no server-only dependencies, so they can be imported from
 * the proxy without pulling in the Prisma client / next/headers.
 */

export const SESSION_COOKIE_NAME = "tl_session";
