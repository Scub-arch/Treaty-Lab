/**
 * Magic-link tokens (SEC-001). 15-minute, single-use, hashed at rest.
 *
 * A magic link does NOT create a user — it only proves control of an email
 * address. The user + org are created on successful consume (see users.ts),
 * so a flood of sign-in requests cannot pollute the User/Org tables.
 */

import { prisma } from "@/lib/db";
import { generateToken, hashToken } from "./tokens";

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface IssuedMagicLink {
  identifier: string;
  rawToken: string;
  expires: Date;
}

/** Issue a single-use magic-link token for an email. Stores only the hash. */
export async function createMagicLink(identifier: string): Promise<IssuedMagicLink> {
  const rawToken = generateToken();
  const token = hashToken(rawToken);
  const expires = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  // One live link per email: clear any prior tokens before issuing.
  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({ data: { identifier, token, expires } });

  return { identifier, rawToken, expires };
}

/**
 * Validate + consume a magic-link token. Always single-use: the token is
 * deleted on any match attempt. Returns the verified email, or null if the
 * token is unknown, mismatched, or expired.
 */
export async function consumeMagicLink(
  identifier: string,
  rawToken: string,
): Promise<string | null> {
  const token = hashToken(rawToken);
  const row = await prisma.verificationToken.findUnique({ where: { token } });
  if (!row || row.identifier !== identifier) return null;

  // Single-use: delete regardless of the expiry check below.
  await prisma.verificationToken.delete({ where: { token } }).catch(() => {});

  if (row.expires.getTime() < Date.now()) return null;
  return row.identifier;
}
