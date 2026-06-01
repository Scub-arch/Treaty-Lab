// AUDIT-004a — admin access via an env allowlist (ADMIN_EMAILS). No persisted
// role: an operator lists admin emails in `ADMIN_EMAILS` (comma/space-separated)
// and a matching signed-in session is treated as admin. Secure default: an empty
// or unset `ADMIN_EMAILS` means **no admins**. Used to gate the read-only
// /admin/audit surface (AUDIT-004b). Deliberately named `isAdmin*` / `ADMIN_EMAILS`
// — distinct from the request-time `UserRole` persona in `src/lib/llm`.
import type { SessionUser } from "./session";

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(/[,\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** True if `email` is in the `ADMIN_EMAILS` allowlist (case-insensitive). */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().has(email.trim().toLowerCase());
}

/** True if the session belongs to an admin. Empty/unset allowlist ⇒ no admins. */
export function isAdminSession(session: SessionUser | null | undefined): boolean {
  return isAdminEmail(session?.email);
}
