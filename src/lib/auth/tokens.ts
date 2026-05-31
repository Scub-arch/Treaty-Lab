/**
 * Token primitives for SEC-001 auth.
 *
 * The raw token is the secret handed to the user (in a cookie or a magic link).
 * We persist only its SHA-256 hash, so a database leak never exposes a usable
 * session cookie or magic link. Lookups hash the presented raw value and match
 * on the hash.
 */

import { randomBytes, createHash } from "node:crypto";

/** Cryptographically random, URL-safe secret. 32 bytes → 43-char base64url. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Deterministic SHA-256 hash (hex) of a raw token — this is what we store. */
export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
