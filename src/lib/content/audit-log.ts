// AUDIT-002a — read model over the ContentRevision audit log. Pure, read-only,
// dependency-injected query helpers (the caller passes the Prisma client), so
// they're testable with `tsx` and free of the @/lib/db singleton's top-level
// await. NOT wired into any route yet — that is AUDIT-004b (`/admin/audit`),
// which is auth-gated and behind its own approval checkpoint.
import type { PrismaClient } from "@/generated/prisma/client";
import type { ContentEntity } from "@/lib/content/revisions";
import { diffSnapshots, type FieldChange } from "@/lib/content/snapshot-diff";

export interface RevisionSummary {
  entity: ContentEntity;
  slug: string;
  version: number;
  editedBy: string | null;
  createdAt: Date;
}

const SUMMARY_SELECT = {
  entity: true,
  slug: true,
  version: true,
  editedBy: true,
  createdAt: true,
} as const;

function asEntity<T extends { entity: string }>(row: T): Omit<T, "entity"> & { entity: ContentEntity } {
  return { ...row, entity: row.entity as ContentEntity };
}

/** Recent revisions, newest first; optional entity/slug filter (default 50). */
export async function listRecentRevisions(
  db: PrismaClient,
  opts: { entity?: ContentEntity; slug?: string; limit?: number } = {},
): Promise<RevisionSummary[]> {
  const rows = await db.contentRevision.findMany({
    where: { entity: opts.entity, slug: opts.slug },
    // createdAt is the primary sort; version is a deterministic tiebreaker for
    // rows written in the same clock tick (SQLite CURRENT_TIMESTAMP is seconds).
    orderBy: [{ createdAt: "desc" }, { version: "desc" }],
    take: opts.limit ?? 50,
    select: SUMMARY_SELECT,
  });
  return rows.map(asEntity);
}

/** Full version history for one entity, ascending. */
export async function getRevisionTimeline(
  db: PrismaClient,
  entity: ContentEntity,
  slug: string,
): Promise<RevisionSummary[]> {
  const rows = await db.contentRevision.findMany({
    where: { entity, slug },
    orderBy: { version: "asc" },
    select: SUMMARY_SELECT,
  });
  return rows.map(asEntity);
}

/** One revision including its JSON snapshot, or null. */
export async function getRevision(
  db: PrismaClient,
  entity: ContentEntity,
  slug: string,
  version: number,
): Promise<(RevisionSummary & { snapshot: unknown }) | null> {
  const row = await db.contentRevision.findFirst({
    where: { entity, slug, version },
    select: { ...SUMMARY_SELECT, snapshot: true },
  });
  return row ? asEntity(row) : null;
}

/** Field-level diff of `version` against `version - 1` (empty if v1 or missing). */
export async function diffRevision(
  db: PrismaClient,
  entity: ContentEntity,
  slug: string,
  version: number,
): Promise<FieldChange[]> {
  if (version <= 1) return [];
  const [prev, curr] = await Promise.all([
    getRevision(db, entity, slug, version - 1),
    getRevision(db, entity, slug, version),
  ]);
  if (!prev || !curr) return [];
  return diffSnapshots(prev.snapshot, curr.snapshot);
}
