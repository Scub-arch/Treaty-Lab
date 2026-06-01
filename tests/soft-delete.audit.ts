import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// AUDIT-001c — verify soft-delete read semantics. content.ts now loads content
// with `where: { deletedAt: null }`, so a soft-deleted row drops from app reads
// while remaining in the DB (audit-preserved). content.ts can't be imported here
// (it pulls the @/lib/db top-level-await singleton), so this exercises the exact
// filtered query content.ts uses, against a real soft-deleted fixture, and
// restores it. Run: npx tsx tests/soft-delete.audit.ts
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function main(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: dbUrl.replace(/^file:/, "") }),
  });

  let slug = "";
  try {
    const ev = await prisma.evidenceItem.findFirst({ where: { deletedAt: null }, select: { slug: true } });
    assert(!!ev, "no seeded EvidenceItem — run `npx prisma db seed`");
    slug = ev!.slug;

    const before = await prisma.evidenceItem.count({ where: { deletedAt: null, slug } });
    assert(before === 1, "row not present in filtered read before soft-delete");

    await prisma.evidenceItem.update({ where: { slug }, data: { deletedAt: new Date() } });

    const filtered = await prisma.evidenceItem.count({ where: { deletedAt: null, slug } });
    const unfiltered = await prisma.evidenceItem.count({ where: { slug } });
    assert(filtered === 0, "filtered (deletedAt:null) read still returns the soft-deleted row");
    assert(unfiltered === 1, "soft-deleted row missing from unfiltered read (must be audit-preserved)");

    console.log(`SOFTDELETE_OK slug=${slug} filtered=${filtered} unfiltered=${unfiltered}`);
  } catch (err) {
    console.error("SOFTDELETE_FAIL:", err instanceof Error ? err.message : String(err));
    await restore(prisma, slug);
    await prisma.$disconnect();
    process.exit(1);
  }

  await restore(prisma, slug);
  await prisma.$disconnect();
}

async function restore(prisma: PrismaClient, slug: string): Promise<void> {
  if (!slug) return;
  await prisma.evidenceItem.update({ where: { slug }, data: { deletedAt: null } }).catch(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
