/**
 * User + Org bootstrap (SEC-001).
 *
 * Called only after a magic link is successfully consumed (email proven). A
 * brand-new email gets a personal Org plus a User in it; returning emails
 * resolve to their existing user + org.
 */

import { prisma } from "@/lib/db";

function slugifyEmail(email: string): string {
  return (
    email
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "org"
  );
}

export interface ResolvedUser {
  userId: string;
  orgId: string;
}

/** Find the user for `email`, or create a User + a personal Org for them. */
export async function findOrCreateUser(email: string): Promise<ResolvedUser> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { userId: existing.id, orgId: existing.orgId };

  const base = slugifyEmail(email);
  let slug = base;
  for (let i = 1; await prisma.org.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${i}`;
  }

  const org = await prisma.org.create({ data: { slug, name: email } });
  const user = await prisma.user.create({
    data: { email, orgId: org.id, emailVerified: new Date() },
  });
  return { userId: user.id, orgId: org.id };
}
