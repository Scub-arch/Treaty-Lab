import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { randomBytes, createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";

// UI-003 a11y audit — seed an authenticated session BEFORE the axe crawl, run as
// a standalone `tsx` step (NOT a Playwright globalSetup: importing the generated
// Prisma client through Playwright's loader trips "exports is not defined in ES
// module scope"). Mints a real Session row exactly as src/lib/auth/session.ts
// createSession() does — store sha256(raw); hand the raw token out as the
// tl_session cookie — and writes it as Playwright storageState so the SEC-001
// proxy lets the crawl reach the real pages instead of /login.
const AUTH_FILE = "tests/.auth/state.json";
const EMAIL = "a11y-audit@treaty-lab.test";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, matches session.ts

async function main(): Promise<void> {
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
    console.log("a11y auth session seeded →", AUTH_FILE);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
