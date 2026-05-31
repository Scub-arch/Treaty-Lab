# v0.4 — Evidence Operations / Audit-Trail Runtime — Plan

_Status: **Planning (docs-only).** Date: 2026-05-31. Baseline: `main` @ `73bb504`,
tag `v0.3.0`. Companion to [`V0_3_PLATFORM_STABILIZATION_MILESTONE.md`](V0_3_PLATFORM_STABILIZATION_MILESTONE.md),
[`LINEAR_BACKLOG.md`](LINEAR_BACKLOG.md), and [`PROJECT_NORTH_STAR.md`](PROJECT_NORTH_STAR.md)._

> This is a **planning document only** — no schema, migration, auth, runtime, or
> UI changes. Each implementation phase that touches schema / migrations / auth
> has an explicit **approval checkpoint** before any code is written.

## 1. What "Evidence Operations" means

Treaty-Lab's value proposition is **source-backed, traceable intelligence** for
Indigenous-infrastructure, water, treaty, finance, and policy analysis. v0.3 made
the platform *stable and deployable*. v0.4 makes it **trustworthy and operational
over time** — i.e., it makes the evidence base a *living, auditable corpus* rather
than a static seed.

Concretely, Evidence Operations is the runtime layer that answers, for any claim
or content item:

- **Who** changed it, **when**, and **from what** to **what** (full revision
  history — no silent overwrites).
- **How reliable** is the evidence behind it, and how has that rating changed.
- **What lifecycle state** a source is in (proposed → verified → contested →
  superseded → retired).
- **How a community, analyst, or counsel can verify** the provenance themselves.

For this domain, **trust is defensibility**: every claim must trace to a cited,
reliability-rated, version-tracked source, every edit must be auditable, and the
Indigenous-oral-history caveat (already in the `.docx` export disclaimer) must be
a first-class principle.

## 2. From DATA-003 foundation → runtime audit logging

DATA-003 (PR #38, migration `20260531230359_data_003_content_versioning_audit_log`)
added the **schema foundation** but, by design, **nothing writes to it yet**:

- The five content models (`EvidenceItem`, `Indicator`, `ProjectAssessment`,
  `PlainLanguageExplainer`, `ModuleConfig`) carry `version Int @default(1)`,
  `editedBy String?`, `editedAt DateTime @default(now()) @updatedAt`,
  `deletedAt DateTime?`.
- `ContentRevision` (append-only: `entity`, `slug`, `version`, `snapshot Json`,
  `editedBy`, `createdAt`, `@@unique([entity, slug, version])`) exists but is
  empty.
- Content today is **read-only at runtime** (written only by `prisma/seed.ts`);
  there is **no `/admin` route** and **no content-mutation API**.

v0.4 turns the foundation into a live audit trail: a **single revision-writing
helper** invoked by any content-mutation path, a **read-only `/admin/audit`**
review surface, and **soft-delete-aware reads** — without a large refactor.

## 3. Proposed audit events

| Event | Trigger | Record |
| --- | --- | --- |
| `content.created` | a content entity is first written | `ContentRevision` v1 snapshot |
| `content.updated` | a content entity changes | `ContentRevision` v(N+1) snapshot + bump live `version`/`editedAt`/`editedBy` |
| `content.soft_deleted` | `deletedAt` is set | revision snapshot marking deletion |
| `content.restored` | `deletedAt` cleared | revision snapshot |
| `evidence.reliability_changed` | `EvidenceItem.reliability` changes | revision snapshot (rating history) |
| `source.lifecycle_transition` | a source changes lifecycle state (§6) | revision snapshot |

(A lighter-weight non-snapshot `AuditEvent` table — for read/view/admin actions —
is a **deferred schema decision**, §8.)

## 4. Proposed `ContentRevision` writing flow

A single, transactional, append-only helper — `recordRevision()` — is the only
sanctioned way content mutates:

```
recordRevision(tx, entity, slug, nextSnapshot, editedBy?):
  current = read live row by (entity, slug)
  nextVersion = (current?.version ?? 0) + 1
  ContentRevision.create({ entity, slug, version: nextVersion, snapshot: nextSnapshot, editedBy })
  upsert/update live row: { ...nextSnapshot, version: nextVersion, editedBy, editedAt: now() }
  // append-only: ContentRevision rows are never updated or deleted
```

- **Transactional** (`prisma.$transaction`) so the snapshot and the live-row bump
  never diverge.
- **Append-only**: revisions are immutable; `editedBy` is a plain `User.id`
  string (not a FK) so the trail survives user deletion.
- **First invocation surfaces**: (a) an optional seed pass that records the
  current seed as **v1 baselines** so the log is non-empty and the mechanism is
  exercised; (b) a future admin edit endpoint.

## 5. Proposed `/admin/audit` experience

- **Auth-gated** server route (uses `auth()` from `@/lib/auth`). ⚠️ Gating to an
  *admin* specifically needs an admin/role signal that does not exist yet —
  **deferred schema decision** (§8). v1 may gate to any authenticated user with a
  clear "admin role TBD" note.
- **List view**: recent `ContentRevision` rows (entity · slug · version ·
  editedBy · createdAt), filterable by entity/slug.
- **Timeline view**: per `(entity, slug)`, the ordered version history.
- **Diff view**: snapshot `N` vs `N-1` (JSON field-level diff), read-only first.
- **Later**: a "restore version" action (writes a *new* revision equal to an old
  snapshot — never mutates history).

## 6. Source lifecycle states

A source/evidence item moves through an explicit, auditable lifecycle:

```
proposed → verified → contested → superseded → retired
```

- **proposed** — ingested, not yet vetted.
- **verified** — provenance checked; reliability rated.
- **contested** — a credible challenge exists (e.g., Indigenous oral history
  differs from the institutional record — surfaced, not hidden).
- **superseded** — replaced by a newer authoritative source (link to successor).
- **retired** — withdrawn; kept for audit, excluded from active citation.

Reliability re-rating and lifecycle transitions are both captured as revisions, so
the evidence base has a full, defensible history.

## 7. Trust & evidence principles

1. **Every claim cites evidence.** No uncited assertions in user-facing output.
2. **No silent overwrites.** Every content change is a new, immutable revision.
3. **No hard deletes.** Soft-delete (`deletedAt`) + restore; hard deletes
   forbidden in app code.
4. **Reliability is explicit and versioned**, never implied.
5. **Contested ≠ hidden.** Indigenous oral histories and counter-records are
   first-class, surfaced alongside the institutional record.
6. **Provenance is user-visible** — `version` / `editedBy` / `editedAt` and the
   source lifecycle should be inspectable, not buried.

## 8. Risks & deferred schema decisions

These require a **separate approval checkpoint** before any schema work (Lane 1 —
high collision with the concurrent roadmap driver; coordinate ownership first):

- **Admin role/permission** — `User` has no role/admin flag today; `/admin/audit`
  gating needs one (a `role`/`isAdmin` column or an `OrgMembership.role`). Schema
  change → **deferred, approval required.**
- **Separate `AuditEvent` table** vs. reusing `ContentRevision` for non-snapshot
  events (views, restores). Schema decision → **deferred.**
- **Source lifecycle column** on `EvidenceItem` (e.g., `lifecycle String`) + a
  successor FK for `superseded`. Schema change → **deferred.**
- **Soft-delete read-filtering** — content getters in `src/lib/content.ts` should
  exclude `deletedAt != null`. This is a *runtime* change (no schema), but it
  alters read behavior across the app → **its own checkpoint.**
- **Seed v1 baselines** — touching `prisma/seed.ts` to record baselines is
  optional and low-risk but is a content-module change → **call out in its PR.**
- **Dual-target** — any new table/column must stay Postgres-safe (no enums / no
  scalar lists; `Json` + scalars) and regenerate `schema.postgres.prisma`.

## 9. Implementation phases

| Phase | Slice | Risk | Touches | Checkpoint |
| --- | --- | --- | --- | --- |
| **0** | This planning doc | LOW | docs only | none (docs-only) |
| **1** | `recordRevision()` helper — pure, unit-testable, **unwired** | LOW–MED | `src/lib/content/` (new file) | proceed-after-plan; no schema |
| **2** | Read-only `/admin/audit` route + list/timeline/diff | MED | new route + `auth()` gating | **approval** (auth) |
| **3** | Content-mutation path (admin edit) writes revisions; soft-delete + restore; getters filter `deletedAt` | MED–HIGH | runtime writes, content getters, possibly admin-role schema | **approval** (schema/auth/runtime) |
| **4** | Source lifecycle + reliability versioning + user-facing provenance | MED–HIGH | `EvidenceItem` schema + UI | **approval** (schema) |

## 10. Acceptance criteria (per phase)

- **Phase 1** — `recordRevision()` exists, is transactional and append-only, has
  unit coverage with fixture data, and is **not** wired into any live path yet;
  `npm run check` + `next build` green.
- **Phase 2** — `/admin/audit` renders the `ContentRevision` list/timeline/diff;
  is auth-gated; reads only (no writes); SSG/runtime behavior unchanged elsewhere.
- **Phase 3** — every content mutation produces exactly one `ContentRevision` and
  one live-row bump in a single transaction; hard deletes are impossible in app
  code; getters exclude soft-deleted rows; existing pages unchanged.
- **Phase 4** — sources carry a lifecycle state; reliability changes are
  auditable; provenance is surfaced in the relevant UI.

---

### Immediate recommended next slice
**Phase 1 — the `recordRevision()` helper (pure, unit-testable, unwired).** It is
the smallest useful step that activates DATA-003, carries **no schema/auth/UI/CI
risk**, and is independently verifiable. It should still be proposed and approved
before implementation per the v0.4 checkpoint discipline. Everything beyond Phase
1 re-enters Lane 1 and must be coordinated with the concurrent roadmap driver.
