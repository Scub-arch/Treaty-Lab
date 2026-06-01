# v0.4 — Evidence Operations / Audit-Trail Runtime — Epics & Issues

_Status: **Planning (docs-only).** Date: 2026-05-31. Baseline: `main` @ `73bb504`,
tag `v0.3.0`. Companion to [`V0_4_EVIDENCE_OPERATIONS_PLAN.md`](V0_4_EVIDENCE_OPERATIONS_PLAN.md)
(the narrative plan) — this file is the **structured backlog**._

> Planning only. No code, schema, migration, Auth.js, `/admin` route, deploy,
> release, tag, or `workflow_dispatch`. Every issue that touches
> schema / runtime / auth / admin carries an explicit **approval checkpoint**.

## 1. Milestone name
**v0.4 — Evidence Operations / Audit-Trail Runtime.**

## 2. Core thesis
Turn the DATA-003 audit/versioning **schema** into an **operational evidence
trail**: record every content/evidence change as an immutable revision, expose
safe admin visibility into that history, and preserve end-to-end source
traceability — **without introducing any deployment or billing risk.**

## 3. Why DATA-003 is only a schema foundation, not a runtime audit system yet
DATA-003 (PR #38) added the *capacity* to audit, but not the *behavior*:
- The five content models carry `version` / `editedBy` / `editedAt` / `deletedAt`,
  and `ContentRevision` exists — but **nothing writes to them** (1 incidental
  `src` reference; the table is empty).
- Content is **read-only at runtime** (written only by `prisma/seed.ts` via
  delete+create, never `update`), so there are **no mutations to capture**.
- There is **no `/admin` route**, **no content-mutation API**, and **no
  revision-writing helper**.
- `editedBy` has **no actor source** yet because there is no admin/edit surface
  and no admin-role signal on `User`.

So DATA-003 is *potential*. v0.4 makes it *operational* with a write path, a read
model, and a safe admin surface.

## 4. Proposed v0.4 epics
| Epic | Title |
| --- | --- |
| **AUDIT-001** | Runtime write path for evidence/content revision tracking |
| **AUDIT-002** | Admin audit read model |
| **AUDIT-003** | Source / provenance event model |
| **AUDIT-004** | Safe admin route planning |
| **AUDIT-005** | Audit test coverage and fixtures |
| **OPS-001** | Repo/workflow safety and zero-cost release discipline |

**Priority scale:** P0 = unblocks the epic · P1 = important this milestone · P2 = high-value, non-blocking.

## 5. Proposed issues (with priority labels)

### AUDIT-001 — Runtime write path
- **AUDIT-001a** (P0) — Pure `recordRevision(tx, entity, slug, nextSnapshot, editedBy?)` helper: transactional, append-only (write `ContentRevision` v(N+1) + bump live row). Unwired.
- **AUDIT-001b** (P2) — Optional: capture **v1 baselines** for the seeded corpus via `recordRevision` so the log is non-empty.
- **AUDIT-001c** (P1) — Soft-delete-aware content getters: `src/lib/content.ts` excludes `deletedAt != null`.

### AUDIT-002 — Admin audit read model
- **AUDIT-002a** (P1) — Read-model query helpers over `ContentRevision` (recent list, per-`(entity,slug)` timeline). No schema.
- **AUDIT-002b** (P1) — Pure JSON snapshot **diff** utility (field-level changes between version N and N-1).

### AUDIT-003 — Source / provenance event model
- **AUDIT-003a** (P1) — **Design** source lifecycle states (`proposed → verified → contested → superseded → retired`) + successor link. *(Schema decision — deferred.)*
- **AUDIT-003b** (P2) — Reliability-change tracking as revisions (rating history).
- **AUDIT-003c** (P2) — Surface provenance (`version`/`editedBy`/`editedAt` + lifecycle) in the relevant UI.

### AUDIT-004 — Safe admin route planning
- **AUDIT-004a** (P0 for gating) — **Decide** the admin role/permission model (`User.role` / `isAdmin` / `OrgMembership.role`). *(Schema + auth — deferred.)*
- **AUDIT-004b** (P1) — Read-only `/admin/audit` route (list/timeline/diff), `auth()`-gated to admins.

### AUDIT-005 — Audit test coverage and fixtures
- **AUDIT-005a** (P1) — Fixtures + tests for `recordRevision` (Node/`tsx` runnable, mirroring existing smoke patterns).
- **AUDIT-005b** (P2) — Tests for the diff utility (AUDIT-002b).

### OPS-001 — Repo/workflow safety & zero-cost discipline
- **OPS-001a** (P1) — Document the $0 guardrails: `Deploy` is `workflow_dispatch` + `DEPLOY_ENABLED`-gated; public-repo Actions are free; no `tags:`/`release:` triggers; no image/package publish.
- **OPS-001b** (P2) — Optional branch hygiene (prune merged feature branches; pure git, no Actions).

## 6. Safe sequencing order
1. **OPS-001a** (docs guardrails) — anytime, $0.
2. **AUDIT-005a** fixtures → **AUDIT-001a** `recordRevision` (no schema).
3. **AUDIT-002a/002b** read model + diff (no schema).
4. **AUDIT-001c** soft-delete getters (runtime read change — own checkpoint).
5. **AUDIT-004a** admin-role decision *(approval)* → unblocks gating.
6. **AUDIT-004b** `/admin/audit` route (after AUDIT-002 + 004a).
7. **AUDIT-003a** lifecycle schema decision *(approval)* → then **003b/003c**.

Rationale: do all **no-schema** work first (helper, read model, diff, tests),
defer every **schema/auth** decision behind an approval gate, and never let an
admin route ship before its permission model is decided.

## 7. Risk classification per issue
| Issue | Risk | Touches |
| --- | --- | --- |
| OPS-001a | **LOW** | docs only |
| OPS-001b | **LOW** | git only (no Actions) |
| AUDIT-001a | **LOW–MED** | `src/lib/content/` (new file), tests |
| AUDIT-001b | **LOW** | `prisma/seed.ts` (content module) |
| AUDIT-001c | **MED** | `src/lib/content.ts` (runtime read behavior) |
| AUDIT-002a | **LOW–MED** | `src/lib/` (new query helpers) |
| AUDIT-002b | **LOW** | `src/lib/` (pure util) |
| AUDIT-005a | **LOW** | `tests/` |
| AUDIT-005b | **LOW** | `tests/` |
| AUDIT-003a | **HIGH** | `prisma/schema.prisma` + migration *(deferred)* |
| AUDIT-003b | **MED** | runtime write path |
| AUDIT-003c | **MED** | UI |
| AUDIT-004a | **HIGH** | schema + Auth.js / session model *(deferred)* |
| AUDIT-004b | **MED** | new route + `auth()` gating |

## 8. Which issues are docs-only
- **OPS-001a** (guardrails doc).
- This planning document and `V0_4_EVIDENCE_OPERATIONS_PLAN.md` (Phase 0).
- The **design** sub-tasks **AUDIT-003a** and **AUDIT-004a** are *decision docs*
  until approved — no code until their schema/auth choice is signed off.

## 9. Which issues touch schema / runtime / auth / admin routes
- **Schema / migrations:** AUDIT-003a, AUDIT-004a (admin role) — **approval gate.**
- **Runtime writes / reads:** AUDIT-001a/001b/001c, AUDIT-003b.
- **Auth.js / session:** AUDIT-004a (role on the auth model), AUDIT-004b (gating).
- **Admin routes:** AUDIT-004b (`/admin/audit`).
- **UI:** AUDIT-003c.
> None of these may be edited without a separate, explicit approval checkpoint.

## 10. Required acceptance criteria per issue
- **AUDIT-001a** — given a snapshot, writes exactly one `ContentRevision` at
  v(N+1) and one live-row bump, in a single transaction; append-only (never
  updates/deletes a revision); unit-tested with fixtures; unwired; gate green.
- **AUDIT-001b** — re-seeding produces a v1 `ContentRevision` per content entity;
  seed remains idempotent; gate + `prisma db seed` green.
- **AUDIT-001c** — content getters omit soft-deleted rows; all existing pages
  render unchanged; `check` + `build` green.
- **AUDIT-002a** — returns recent revisions + a per-entity timeline; read-only.
- **AUDIT-002b** — deterministic field-level diff between two snapshots; unit-tested.
- **AUDIT-003a** — a written, approved decision on lifecycle states + storage
  (column vs. table) before any migration.
- **AUDIT-003b** — reliability changes appear as revisions; history is queryable.
- **AUDIT-003c** — provenance is visible on the relevant entity page.
- **AUDIT-004a** — a written, approved admin-permission model before code.
- **AUDIT-004b** — `/admin/audit` renders list/timeline/diff; returns 401/redirect
  for non-admins; reads only; SSG/runtime elsewhere unchanged.
- **AUDIT-005a/b** — fixtures + tests run locally (no browser needed) and in CI.
- **OPS-001a** — guardrails documented and cross-linked; no workflow changes.

## 11. Definition of done for v0.4
- Every content **mutation** produces exactly one immutable `ContentRevision`
  and a live-row version bump (AUDIT-001).
- A **read-only, admin-gated `/admin/audit`** surface shows revision history with
  a diff view (AUDIT-002 + AUDIT-004).
- **Hard deletes are impossible in app code**; soft-delete + restore work, and
  getters hide soft-deleted rows (AUDIT-001c).
- **Source provenance** (version/editor/lifecycle) is auditable and surfaced
  (AUDIT-003).
- **Test coverage** for the write path + diff (AUDIT-005); required CI `check`
  stays green.
- **Zero deploy/billing**: no deploy, release, tag, or paid service introduced;
  `Deploy` remains manual + gated (OPS-001).

## 12. Explicit guardrails (zero-cost / no cloud-triggered work)
- **No deploy** — `Deploy` stays `workflow_dispatch` + `DEPLOY_ENABLED`-gated; never auto-trigger it.
- **No tags / releases** during development; tagging is a deliberate, separate, approved step (as with `v0.3.0`).
- **No `workflow_dispatch`** of any workflow.
- **No paid services** — no Fly.io/Vercel/Codespaces/paid runners/paid APIs; no GitHub Packages, GHCR, npm publish, Docker image push, or artifact uploads beyond required CI.
- **Public repo ⇒ Actions are free**; CI (`check`) + non-required `a11y` run within the free allowance.
- **Schema / migration / auth / admin work is approval-gated** — stop and ask before editing those.
- **Do not disturb the `v0.3.0` checkpoint.**
