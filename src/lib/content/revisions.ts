// AUDIT-001a — the runtime write primitive for content versioning / audit log.
//
// DATA-003 added the `ContentRevision` table and per-row `version`/`editedBy`/
// `editedAt`/`deletedAt`, but nothing writes to them yet. `recordRevision` is the
// single sanctioned way content mutates: in ONE transaction it snapshots an
// entity at the next version and bumps the live row. It is append-only
// (`ContentRevision` rows are never updated or deleted) and **dependency-injected**
// (the caller passes the Prisma client) so it stays a pure primitive — testable
// with `tsx`, and not yet wired into any runtime mutation path.
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

/** The five top-level content collections that carry audit columns (DATA-003). */
export const CONTENT_ENTITIES = [
  "EvidenceItem",
  "Indicator",
  "ProjectAssessment",
  "PlainLanguageExplainer",
  "ModuleConfig",
] as const;

export type ContentEntity = (typeof CONTENT_ENTITIES)[number];

export interface RevisionInput {
  entity: ContentEntity;
  slug: string;
  /** Full JSON snapshot of the record (+ its owned children) at this version. */
  snapshot: Prisma.InputJsonValue;
  /** `User.id` of the editor; null for seed/system edits. */
  editedBy?: string | null;
}

/**
 * Append-only revision write. In a single transaction: read the live row's
 * current `version` for `(entity, slug)`, write a `ContentRevision` at
 * `version + 1` with the snapshot, and bump the live row's `version` + `editedBy`
 * (`editedAt` auto-updates via `@updatedAt`). Returns the new version. Throws if
 * no live row exists for the slug. Never updates or deletes an existing revision.
 */
export async function recordRevision(db: PrismaClient, input: RevisionInput): Promise<number> {
  const { entity, slug, snapshot, editedBy = null } = input;

  return db.$transaction(async (tx) => {
    let current: number | null = null;
    switch (entity) {
      case "EvidenceItem":
        current = (await tx.evidenceItem.findUnique({ where: { slug }, select: { version: true } }))?.version ?? null;
        break;
      case "Indicator":
        current = (await tx.indicator.findUnique({ where: { slug }, select: { version: true } }))?.version ?? null;
        break;
      case "ProjectAssessment":
        current = (await tx.projectAssessment.findUnique({ where: { slug }, select: { version: true } }))?.version ?? null;
        break;
      case "PlainLanguageExplainer":
        current = (await tx.plainLanguageExplainer.findUnique({ where: { slug }, select: { version: true } }))?.version ?? null;
        break;
      case "ModuleConfig":
        current = (await tx.moduleConfig.findUnique({ where: { slug }, select: { version: true } }))?.version ?? null;
        break;
    }

    if (current === null) {
      throw new Error(`recordRevision: no ${entity} with slug "${slug}"`);
    }
    const version = current + 1;

    await tx.contentRevision.create({ data: { entity, slug, version, snapshot, editedBy } });

    switch (entity) {
      case "EvidenceItem":
        await tx.evidenceItem.update({ where: { slug }, data: { version, editedBy } });
        break;
      case "Indicator":
        await tx.indicator.update({ where: { slug }, data: { version, editedBy } });
        break;
      case "ProjectAssessment":
        await tx.projectAssessment.update({ where: { slug }, data: { version, editedBy } });
        break;
      case "PlainLanguageExplainer":
        await tx.plainLanguageExplainer.update({ where: { slug }, data: { version, editedBy } });
        break;
      case "ModuleConfig":
        await tx.moduleConfig.update({ where: { slug }, data: { version, editedBy } });
        break;
    }

    return version;
  });
}

/**
 * AUDIT-001b — write a baseline `ContentRevision` at `version` (default 1)
 * WITHOUT bumping the live row, used at seed time to snapshot the corpus as v1.
 * Idempotent via the `(entity, slug, version)` unique key, so re-seeding doesn't
 * duplicate. The snapshot is JSON-normalised (drops `undefined`). Only needs the
 * `contentRevision` delegate, so a transaction client satisfies it.
 */
export async function recordBaseline(
  db: Pick<PrismaClient, "contentRevision">,
  input: { entity: ContentEntity; slug: string; snapshot: unknown; version?: number; editedBy?: string | null },
): Promise<number> {
  const { entity, slug, snapshot, version = 1, editedBy = null } = input;
  const clean = JSON.parse(JSON.stringify(snapshot ?? null)) as Prisma.InputJsonValue;
  await db.contentRevision.upsert({
    where: { entity_slug_version: { entity, slug, version } },
    create: { entity, slug, version, snapshot: clean, editedBy },
    update: { snapshot: clean, editedBy },
  });
  return version;
}
