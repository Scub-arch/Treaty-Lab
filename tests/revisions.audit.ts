import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { recordRevision } from "../src/lib/content/revisions";

// AUDIT-001a / AUDIT-005a — verify recordRevision against the seeded dev.db
// (Node-only, no browser). Constructs its own Prisma client via relative imports
// — the same pattern as prisma/seed.ts — so it runs under `tsx` without touching
// the @/lib/db singleton (which has top-level await). Cleans up after itself so
// it is re-runnable. Run: npx tsx tests/revisions.audit.ts
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function main(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: dbUrl.replace(/^file:/, "") }),
  });

  let startVersion = 1;
  let slug = "";
  try {
    const ev = await prisma.evidenceItem.findFirst({ select: { slug: true, version: true } });
    assert(!!ev, "no seeded EvidenceItem to test against — run `npx prisma db seed`");
    slug = ev!.slug;
    startVersion = ev!.version;

    // First edit → version+1, ContentRevision row written, live row bumped.
    const v1 = await recordRevision(prisma, {
      entity: "EvidenceItem",
      slug,
      snapshot: { test: 1, slug },
      editedBy: "audit-001a-test",
    });
    assert(v1 === startVersion + 1, `expected v1=${startVersion + 1}, got ${v1}`);

    const rev1 = await prisma.contentRevision.findFirst({
      where: { entity: "EvidenceItem", slug, version: v1 },
    });
    assert(!!rev1, "ContentRevision v1 not written");
    assert((rev1!.editedBy ?? null) === "audit-001a-test", "revision editedBy mismatch");

    const live1 = await prisma.evidenceItem.findUnique({
      where: { slug },
      select: { version: true, editedBy: true },
    });
    assert(live1?.version === v1, "live row version not bumped");
    assert(live1?.editedBy === "audit-001a-test", "live row editedBy not set");

    // Second edit → increments again; both revisions persist (append-only).
    const v2 = await recordRevision(prisma, {
      entity: "EvidenceItem",
      slug,
      snapshot: { test: 2 },
      editedBy: null,
    });
    assert(v2 === v1 + 1, `expected v2=${v1 + 1}, got ${v2}`);

    const count = await prisma.contentRevision.count({ where: { entity: "EvidenceItem", slug } });
    assert(count >= 2, "append-only broken: both revisions not present");

    console.log(`AUDIT_OK slug=${slug} start=${startVersion} v1=${v1} v2=${v2} revisions=${count}`);
  } catch (err) {
    console.error("AUDIT_FAIL:", err instanceof Error ? err.message : String(err));
    await cleanup(prisma, slug, startVersion);
    await prisma.$disconnect();
    process.exit(1);
  }

  await cleanup(prisma, slug, startVersion);
  await prisma.$disconnect();
}

async function cleanup(prisma: PrismaClient, slug: string, startVersion: number): Promise<void> {
  if (!slug) return;
  // Remove the test revisions and restore the live row to its pre-test state, so
  // the seeded dev.db is unchanged and the test is re-runnable.
  await prisma.contentRevision
    .deleteMany({ where: { entity: "EvidenceItem", slug, version: { gt: startVersion } } })
    .catch(() => {});
  await prisma.evidenceItem
    .update({ where: { slug }, data: { version: startVersion, editedBy: null } })
    .catch(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
