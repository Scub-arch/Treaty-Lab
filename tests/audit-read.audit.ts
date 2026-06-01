import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { recordRevision } from "../src/lib/content/revisions";
import {
  diffRevision,
  getRevision,
  getRevisionTimeline,
  listRecentRevisions,
} from "../src/lib/content/audit-log";
import { diffSnapshots } from "../src/lib/content/snapshot-diff";

// AUDIT-002 / AUDIT-005b — verify the read model + diff. Two parts: a pure
// diffSnapshots unit test (no DB), then a DB test that stages revisions with the
// merged recordRevision, queries them, and cleans up (re-runnable). Run under
// tsx: npx tsx tests/audit-read.audit.ts
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function testDiffPure(): void {
  const d = diffSnapshots({ a: 1, b: "x", c: [1, 2] }, { a: 2, c: [1, 2], d: true });
  const byField = Object.fromEntries(d.map((x) => [x.field, x.kind]));
  assert(byField.a === "changed", "a should be changed");
  assert(byField.b === "removed", "b should be removed");
  assert(byField.d === "added", "d should be added");
  assert(!("c" in byField), "c (equal array) should be unchanged");
  assert(d.length === 3, `expected 3 changes, got ${d.length}`);
  assert(d.map((x) => x.field).join(",") === "a,b,d", "diff must be sorted by field");
}

async function main(): Promise<void> {
  testDiffPure();

  const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: dbUrl.replace(/^file:/, "") }),
  });

  let slug = "";
  let startVersion = 1;
  try {
    const ev = await prisma.evidenceItem.findFirst({ select: { slug: true, version: true } });
    assert(!!ev, "no seeded EvidenceItem — run `npx prisma db seed`");
    slug = ev!.slug;
    startVersion = ev!.version;

    const v2 = await recordRevision(prisma, {
      entity: "EvidenceItem",
      slug,
      snapshot: { title: "A", n: 1 },
      editedBy: "audit-002-test",
    });
    const v3 = await recordRevision(prisma, {
      entity: "EvidenceItem",
      slug,
      snapshot: { title: "B", n: 1 },
      editedBy: "audit-002-test",
    });
    assert(v3 === v2 + 1, `expected v3=${v2 + 1}, got ${v3}`);

    const recent = await listRecentRevisions(prisma, { entity: "EvidenceItem", slug, limit: 10 });
    assert(recent.length >= 2, "listRecentRevisions missing rows");
    assert(recent[0].version === v3, "list not newest-first");
    assert(!("snapshot" in recent[0]), "list summary must omit snapshot");

    const timeline = await getRevisionTimeline(prisma, "EvidenceItem", slug);
    assert(timeline[timeline.length - 1].version === v3, "timeline not ascending/complete");

    const one = await getRevision(prisma, "EvidenceItem", slug, v3);
    assert(!!one && (one!.snapshot as { title?: string }).title === "B", "getRevision snapshot wrong");

    const diff = await diffRevision(prisma, "EvidenceItem", slug, v3);
    const titleChange = diff.find((c) => c.field === "title");
    assert(!!titleChange && titleChange!.kind === "changed", "diffRevision: title not changed");

    console.log(`AUDIT_READ_OK recent=${recent.length} timeline=${timeline.length} diff=${diff.length}`);
  } catch (err) {
    console.error("AUDIT_READ_FAIL:", err instanceof Error ? err.message : String(err));
    await cleanup(prisma, slug, startVersion);
    await prisma.$disconnect();
    process.exit(1);
  }

  await cleanup(prisma, slug, startVersion);
  await prisma.$disconnect();
}

async function cleanup(prisma: PrismaClient, slug: string, startVersion: number): Promise<void> {
  if (!slug) return;
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
