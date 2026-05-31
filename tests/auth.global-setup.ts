import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { randomBytes, createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";

// UI-003 a11y audit — authenticate once before the axe crawl. The SEC-001 proxy
// gates page navigation on the presence of a session cookie, so we mint a REAL
// Session row exactly as src/lib/auth/session.ts createSession() does — store
// sha256(raw); hand the raw token out as the cookie — and persist it as
// Playwright storageState. This runs in Node (no browser), so the auth wiring
// can be verified with `tsx` independently of the CI-only browser crawl.
const AUTH_FILE = "tests/.auth/state.json";
const EMAIL = "a11y-audit@treaty-lab.test";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, matches session.ts

export default async function globalSetup(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: dbUrl.replace(/^file:/, "") }),
  });

  try {
    // Resolve or bootstrap the audit user + org (mirrors findOrCreateUser()).
    let user = await prisma.user.findUnique({ where: { email: EMAIL } });
    if (!user) {
      const org = await prisma.org.create({ data: { slug: "a11y-audit", name: EMAIL } });
      user = await prisma.user.create({
        data: { email: EMAIL, orgId: org.id, emailVerified: new Date() },
      });
    }

    // Mint a session: persist the hash, hand out the raw token as the cookie.
    const raw = randomBytes(32).toString("base64url");
    const sessionToken = createHash("sha256").update(raw).digest("hex");
    await prisma.session.create({
      data: {
        sessionToken,
        userId: user.id,
        orgId: user.orgId,
        expires: new Date(Date.now() + SESSION_TTL_MS),
      },
    });

    mkdirSync("tests/.auth", { recursive: true });
    writeFileSync(
      AUTH_FILE,
      JSON.stringify({
        cookies: [
          {
            name: "tl_session",
            value: raw,
            domain: "127.0.0.1",
            path: "/",
            expires: -1,
            httpOnly: true,
            secure: false,
            sameSite: "Lax",
          },
        ],
        origins: [],
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}
