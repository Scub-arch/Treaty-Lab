import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import type { ContentEntity } from "../src/lib/content/revisions";

// AUDIT-001b — verify the seed wrote a v1 ContentRevision baseline for every
// content entity. Read-only (no mutation, no cleanup). Assumes the DB was seeded
// with the AUDIT-001b seed: `npx prisma db seed`. Run: npx tsx tests/baseline.audit.ts
function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

async function main(): Promise<void> {
  const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: dbUrl.replace(/^file:/, "") }),
  });

  try {
    const checks: Array<{ entity: ContentEntity; live: () => Promise<number> }> = [
      { entity: "EvidenceItem", live: () => prisma.evidenceItem.count({ where: { deletedAt: null } }) },
      { entity: "Indicator", live: () => prisma.indicator.count({ where: { deletedAt: null } }) },
      { entity: "ProjectAssessment", live: () => prisma.projectAssessment.count({ where: { deletedAt: null } }) },
      { entity: "PlainLanguageExplainer", live: () => prisma.plainLanguageExplainer.count({ where: { deletedAt: null } }) },
      { entity: "ModuleConfig", live: () => prisma.moduleConfig.count({ where: { deletedAt: null } }) },
    ];

    const summary: string[] = [];
    for (const { entity, live } of checks) {
      const liveCount = await live();
      const baselineCount = await prisma.contentRevision.count({ where: { entity, version: 1 } });
      assert(liveCount > 0, `${entity}: no live rows — run \`npx prisma db seed\``);
      assert(baselineCount === liveCount, `${entity}: ${baselineCount} v1 baselines != ${liveCount} live rows`);
      summary.push(`${entity}=${baselineCount}`);
    }

    // Spot-check a snapshot and that the live row is still v1 (baseline must not bump).
    const ev = await prisma.evidenceItem.findFirst({ select: { slug: true, version: true } });
    assert(!!ev && ev!.version === 1, "live evidence version should be 1 (baseline must not bump it)");
    const rev = await prisma.contentRevision.findFirst({
      where: { entity: "EvidenceItem", slug: ev!.slug, version: 1 },
    });
    assert(!!rev && rev!.snapshot != null, "evidence v1 baseline snapshot missing");

    console.log(`BASELINE_OK ${summary.join(" ")}`);
  } catch (err) {
    console.error("BASELINE_FAIL:", err instanceof Error ? err.message : String(err));
    await prisma.$disconnect();
    process.exit(1);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
