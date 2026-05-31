# v0.3 — Platform Stabilization — Milestone Closeout

_Status: **Complete (effectively).** Date: 2026-05-31. Main HEAD at closeout: `f75ac2c`._

> Companion to [`V0.3-COMPLETION-PLAN.md`](V0.3-COMPLETION-PLAN.md) and
> [`LINEAR_BACKLOG.md`](LINEAR_BACKLOG.md). This document records what landed,
> how it was verified, what is deliberately deferred, and the recommended next
> milestone.

## 1. Executive summary

The **v0.3 platform-stabilization** milestone is complete. Treaty-Lab has moved
from a research pilot to a deployable, source-backed intelligence platform: every
lane in the 20-issue backlog — **foundation, CI, database, AI/RAG, security, UI,
reports, accessibility, and deployment** — has landed on `main`. The application
builds and passes its required CI gate (`check`), content is database-backed
(Prisma), routes are authenticated and rate-limited, security headers ship, the
AI Q&A path is de-duplicated/cached/retrieval-augmented, the reports surface is
live, an accessibility audit runs in CI, and a production container + structured
logging exist. The final foundation piece — **DATA-003 content versioning/audit
log schema** — merged as PR #38.

## 2. Merged milestone items

| Lane | Issue | PR(s) |
| --- | --- | --- |
| Foundation | FND-001 — repo cleanup | #6 |
| Foundation | FND-002 — CI gate (`check`: content-validate + typecheck + build) | #8 |
| Foundation | FND-003 — PR template + contributing guide | #7 |
| Database | DATA-001 — content collections → Prisma/Postgres | #10, #12, #13 |
| Database | DATA-002 — project ↔ treaty FK (many-to-many) | #17 |
| Database | DATA-003 — content versioning / audit-log **foundation** | **#38** |
| AI / RAG | AI-001 — de-dup token cache + prompt into `src/lib/llm/` | #21 |
| AI / RAG | AI-002 — response cache (in-memory LRU) | #25 |
| AI / RAG | AI-003 — Databricks service-principal (M2M) auth path | #22 |
| AI / RAG | AI-004 — BM25 evidence retrieval | #24 |
| Security | SEC-001 — Auth.js-style sessions + magic-link + route protection | #16 |
| Security | SEC-002 — rate-limit middleware on chat routes | #19 |
| Security | SEC-003 — security headers + CSP (report-only) | #27 |
| UI | UI-001 — error + loading boundaries on every page | #18 |
| UI | UI-002 — persisted `/ask` transcripts | #28 |
| UI | UI-003 — themes + reduced motion + a11y audit + fixes | #32, #33, #36, #37 |
| Reports | RPT-001 — live `/reports` charts | #30 |
| Reports | RPT-002 — `.docx` project-assessment export | #26 |
| Deployment | DPL-001 — Dockerfile + Fly target + `/api/healthz` | #23 |
| Deployment | DPL-002 — structured logging (pino) | #35 |

_Supporting infrastructure: `#14` (this completion plan), `#29` (Postgres
driver adapter), `#34` (CI actions bump), plus the early `#1`–`#5` grounding /
NRTA-ingestion work that predates the v0.3 numbering._

## 3. DATA-003 — final status

- **PR #38 merged** (`Merge pull request #38`, merge commit `f75ac2c`; feature
  commit `9bc6b8a`).
- **Migration:** `20260531230359_data_003_content_versioning_audit_log`.
- **Audit/versioning columns** added to the five top-level content models —
  `EvidenceItem`, `Indicator`, `ProjectAssessment`, `PlainLanguageExplainer`,
  `ModuleConfig`: `version Int @default(1)`, `editedBy String?`,
  `editedAt DateTime @default(now()) @updatedAt`, `deletedAt DateTime?`
  (`editedAt` named distinctly from the existing content `Indicator.updatedAt`).
- **`ContentRevision`** added — append-only, immutable JSON snapshots keyed by
  `@@unique([entity, slug, version])`; `editedBy` is a plain `String?` (not a FK)
  so the trail survives user deletion.
- **Foundation-level only.** The migration is additive (SQLite table-rebuild that
  copies all existing data and backfills new columns from their defaults — no
  data loss); `seed.ts`, `content.ts`, and all UI were untouched.
- **No revision-writing helper, middleware, or audit UI yet** — deliberately
  deferred (see §6): there is no runtime content-editing surface to instrument.

## 4. Verification status

- **Required CI check (`check`): green** on PR #38 and on `main` after merge.
- **`npm run check` after merge: green** — `check:content`, `check:nrta`,
  `check:schema` (`schema.postgres.prisma is up to date`), and `tsc --noEmit`.
- **Build + seed** previously passed on the PR branch — `npm run build` ✅ and
  `npx prisma db seed` ✅ (re-seeded clean with `seed.ts` unchanged).
- **Adversarial schema/migration review** (migration safety · dual-target
  Postgres · design/scope) returned **0 confirmed findings**.
- **No deploy was triggered** by the merge.

## 5. Known non-blockers

- The **non-required `axe` accessibility check is red on `/ask`** — specifically
  the dim "[BOOT] … analyst console" terminal output (`text-zinc-600/700`,
  ~1.9–2.57:1).
- **Reason: an intentional dim-terminal aesthetic**, not a structural defect.
- The **High-contrast theme remains the WCAG-AA path** for users who need it; the
  default terminal theme deliberately keeps its look.
- After UI-003, the audit is **17/18 routes green with 0 critical and 0
  structural** violations — this lone red is a **design decision, not a broken
  accessibility primitive**, and the `axe` job is **non-required** so it never
  blocks merges.

## 6. Deferred follow-ups

These are out of v0.3 scope and are tracked for a future milestone:

1. **DATA-003 runtime layer** — the revision-writing helper / Prisma middleware
   and the auth-gated `/admin/audit` diff UI (write a `ContentRevision` on every
   content update; review history with a diff view).
2. **Hard-delete enforcement** — forbid hard deletes in app code (soft-delete via
   `deletedAt`) once a runtime content-editing surface exists.
3. **`/ask` console contrast** — an explicit styling decision: keep the dim
   terminal aesthetic (documented) vs. lift it to AA on the default theme.
4. **Release tag / deployment decision** — optionally tag `v0.3.0` and decide
   whether to set `DEPLOY_ENABLED=true` + `FLY_API_TOKEN` to go live (the deploy
   workflow is manual + gated today).

## 7. Recommended next milestone

**v0.4 — Evidence Operations / Audit-Trail Runtime.** With the schema foundation
in place, v0.4 should make the audit trail *operational* and deepen source
traceability:

- **Activate revision writing** — wire the `ContentRevision` log into a content
  write path (middleware/helper), turning DATA-003 from foundation into a live
  audit trail.
- **`/admin/audit` review UI** — list recent revisions with a diff view
  (auth-gated; the first content-editing surface).
- **Evidence lifecycle** — soft-delete + restore, hard-delete enforcement, and
  surfacing `version` / `editedBy` / `editedAt` provenance in the UI.
- **Source traceability** — strengthen evidence ↔ claim ↔ project provenance and
  make citation integrity a first-class, auditable property.
