import { isAdminEmail, isAdminSession } from "../src/lib/auth/admin";
import type { SessionUser } from "../src/lib/auth/session";

// AUDIT-004a — pure unit test for the admin allowlist (no DB, no server). Toggles
// process.env.ADMIN_EMAILS and asserts the gate. Run: npx tsx tests/admin.audit.ts
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function session(email: string): SessionUser {
  return { userId: "u1", orgId: "o1", email, name: null };
}

function main(): void {
  // Secure default: empty/unset ⇒ no admins.
  delete process.env.ADMIN_EMAILS;
  assert(!isAdminEmail("a@b.com"), "unset env must yield no admins");
  assert(!isAdminSession(session("a@b.com")), "unset env: no admin session");
  assert(!isAdminSession(null), "null session is not admin");

  // Allowlist (comma/space-separated, with stray whitespace + mixed case).
  process.env.ADMIN_EMAILS = "  Admin@Treaty.test , ops@treaty.test ";
  assert(isAdminEmail("admin@treaty.test"), "in-list match");
  assert(isAdminEmail("ADMIN@TREATY.TEST"), "in-list match is case-insensitive");
  assert(isAdminSession(session("ops@treaty.test")), "session email in-list");
  assert(!isAdminEmail("nobody@treaty.test"), "out-of-list must be denied");
  assert(!isAdminEmail(null), "null email denied");
  assert(!isAdminEmail(""), "empty email denied");

  console.log("ADMIN_OK");
}

main();
