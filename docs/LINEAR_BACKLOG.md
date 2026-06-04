# Treaty-Lab — Linear Backlog (next 20 issues)

> Companion to `ARCHITECTURE.md`, `REPO_MAP.md`. These 20 issues are the
> next planned units of work, ordered to take Treaty-Lab from
> research-pilot to deployable v0.3. Each is sized to fit one to three
> days of focused work and ships an independently shippable slice.

**Priority scale:**

- **P0** — must land before anything else in the epic can start.
- **P1** — important; should land in this iteration.
- **P2** — high-value but not blocking.

**Labels** map to Linear groups:
`foundation` · `database` · `ai-rag` · `ui` · `reports` · `security` · `deployment`

---

## Status — re-baseline (2026-06-03)

> **This backlog had gone stale.** The issue text below is the original v0.3 plan,
> kept verbatim for reference. This banner re-baselines it against `main` @
> `8c0bede` — it records what has **since shipped**. It is a status re-baseline,
> **not** a new feature scope.

**All five original v0.3 P0s are complete and on `main`:**

| P0       | Status                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------- |
| FND-001  | ✅ Completed — repo cleanup.                                                                      |
| FND-002  | ✅ Completed — CI gate; **re-hardened by PR #57** (gate split into parallel jobs + README docs).  |
| DATA-001 | ✅ Completed — content collections promoted to Prisma/Postgres (#10, #12, #13).                   |
| AI-001   | ✅ Completed — `/api/ask` token-cache + prompt de-dup; **AI-001b ask-context dedup follow-up merged (PR #58)**. |
| SEC-001  | ✅ Completed — auth + route protection, hardened through the magic-link work (**PR #55, #56**).    |

**DATA-001 and SEC-001 are no longer the next blockers** — both have landed. The
broader 20-issue v0.3 milestone is recorded as complete in
[`V0_3_PLATFORM_STABILIZATION_MILESTONE.md`](V0_3_PLATFORM_STABILIZATION_MILESTONE.md).

**v0.4 — Evidence Operations is already underway** through the AUDIT slices (the
admin-allowlist work, AUDIT-004a, has merged via #54). The **likely next code item
is AUDIT-004b** — the read-only, admin-gated `/admin/audit` route — but it is
**pending ownership/coordination** with the concurrent roadmap driver and is **not
started here**. See
[`V0_4_EVIDENCE_OPERATIONS_EPICS.md`](V0_4_EVIDENCE_OPERATIONS_EPICS.md).

---

## Epic 1 — Foundation (3 issues)

### FND-001 — Clean up the repo per `docs/REPO_MAP.md` ✅ Completed

**Goal.** Apply the inventory recommendations in `docs/REPO_MAP.md` so the
working tree matches a production-grade layout before any feature work
lands on it.

**Acceptance criteria:**

- `dev.db`, `.env`, `*.tsbuildinfo`, `node_modules/`, `.next/` are gitignored.
- `dev.db` and `.env` are `git rm --cached`'d; `ANTHROPIC_API_KEY` is rotated.
- `.env.example` exists, listing every env var the app reads (no values).
- 5 Next.js scaffold SVGs under `public/` are deleted.
- 5 `.work/v0xx-commit-msg.txt` files are deleted (commits already in git history).
- `scripts/extract-pdfs.mjs`, `scripts/chat.ts`, `.work/probe-db.mjs` moved
  to `scripts/dev/`, with `chat.ts` renamed to `anthropic-cli-chat.ts`.
- `.work/agent-out-*.md` either promoted to `docs/research-notes/` or
  `.work/` is gitignored wholesale (pick one and document in README).
- `README.md` is refreshed and links out to `docs/ARCHITECTURE.md`.
- `SECURITY.md` template is replaced with a real reporting address +
  supported-version statement.
- `npm run check` still passes after the cleanup.

**Priority:** P0

---

### FND-002 — Add CI workflow (typecheck, content-validate, build) ✅ Completed (re-hardened by PR #57)

**Goal.** Every PR must pass typecheck, content-validation, and a production
build before merge. No more "works on my machine" landing in `main`.

**Acceptance criteria:**

- `.github/workflows/ci.yml` runs on `pull_request` and `push` to `main`.
- Jobs: `setup` (Node 22, `npm ci`), `typecheck` (`tsc --noEmit`),
  `content-validate` (`npm run check:content`), `build` (`next build` with
  `NODE_ENV=production`).
- Each job runs in parallel after `setup`; final `gate` job depends on all
  three.
- Branch-protection rule on `main` requires the `gate` job to pass.
- Cache `node_modules` keyed by `package-lock.json` hash; cache `.next/cache`
  keyed by source-tree hash.
- Workflow runs in <5 min on a clean cache, <2 min on a warm cache.
- README documents the gate in a "Contributing" section.

**Priority:** P0

---

### FND-003 — Add `PULL_REQUEST_TEMPLATE.md` + commit-style guide

**Goal.** Make PR reviews fast and consistent.

**Acceptance criteria:**

- `.github/PULL_REQUEST_TEMPLATE.md` exists with a checklist:
  schema-migration noted, content-validator passes, tests added/updated,
  docs touched, screenshots if UI, breaking-change call-out.
- A short `docs/CONTRIBUTING.md` documents commit-message style
  (Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, etc.).
- Existing contributors (just you) acknowledged in `docs/CONTRIBUTING.md`.

**Priority:** P2

---

## Epic 2 — Database (3 issues)

### DATA-001 — Promote `evidence`, `projects`, `indicators`, `explainers`, `modules` to Postgres ✅ Completed

**Goal.** Move the five JSON content collections into proper Prisma models
backed by Postgres, with foreign keys replacing slug-string references.

**Acceptance criteria:**

- `prisma/schema.prisma` provider switches from `sqlite` to `postgresql`
  (keep a separate `prisma/schema.sqlite.prisma` for local dev if needed,
  or document the dual-target via `previewFeatures`).
- New models: `EvidenceItem`, `ProjectAssessment`, `Indicator`,
  `PlainLanguageExplainer`, `ModuleConfig`, plus join tables for
  `ProjectAssessment.parties[]`, `ProjectAssessment.firstNationImplications[]`,
  `ProjectAssessment.primarySources[]`, etc.
- All slug-FK relations become proper `@relation` FKs with
  `onDelete: Restrict`.
- `prisma/seed.ts` extended to seed-from-JSON: reads `src/content/*.json`,
  inserts records inside a single transaction, fails loud on cross-reference
  errors.
- `src/lib/content.ts` re-exports the same getter API but reads from Prisma
  (or a thin in-memory cache populated at server start).
- `src/lib/content/validators.ts` becomes a write-time validator (used by
  the seed + future admin UI), not a read-time one.
- A new `npm run db:reset` script drops + migrates + seeds.
- The five `src/content/*.json` files stay in place as the seed corpus;
  document in README that they are the source of truth for seeding,
  not for runtime reads.
- All existing pages render unchanged with the new backend.

**Priority:** P0 (blocks DATA-002, DATA-003, RPT-001, UI-002)

---

### DATA-002 — Cross-store FK between content + treaty registry

**Goal.** A `ProjectAssessment` can reference the specific `Treaty` records
(Treaty 6, Treaty 8, NRTA, etc.) it operates under, and a `Treaty` page can
surface every project that touches it.

**Acceptance criteria:**

- `ProjectAssessment` gains `relatedTreaties: Treaty[]` (many-to-many) once
  DATA-001 lands.
- Seed file maps existing project narratives to their relevant treaty slugs
  (`treaty-6-1876`, `treaty-8-1899`, `nrta-1930-…`, etc.).
- `/projects/[slug]` renders a "Operates under" section linking out to
  `/archive/[treatySlug]`.
- `/archive/[slug]` renders a "Projects affected" section linking back to
  `/projects/[slug]`.
- `validateContent()` (or its successor) cross-checks the FK.

**Priority:** P1 (blocked by DATA-001)

---

### DATA-003 — Versioning + audit log for content edits

**Goal.** Every content edit is auditable. No claim or evidence change can
silently overwrite the prior version.

**Acceptance criteria:**

- Each content model gains: `version: Int @default(1)`, `editedBy: String`,
  `editedAt: DateTime @updatedAt`, `deletedAt: DateTime?` (soft delete).
- A `ContentRevision` table stores prior versions as JSON snapshots, keyed
  by `(modelName, slug, version, snapshot)`.
- A Prisma middleware (or a server-side helper) writes a `ContentRevision`
  row on every update.
- A `/admin/audit` route (auth-gated — depends on SEC-001) lists recent
  revisions with diff view.
- Hard deletes are forbidden in app code; only soft-deletes via `deletedAt`.

**Priority:** P1 (blocked by DATA-001, SEC-001)

---

## Epic 3 — AI / RAG (4 issues)

### AI-001 — De-duplicate token cache + system prompt across the two `/api/ask` routes ✅ Completed (AI-001b follow-up merged, PR #58)

**Goal.** Single source of truth for the Databricks auth recipe and the
system prompt; one place to change them.

**Acceptance criteria:**

- New module `src/lib/llm/` containing:
  - `prompts.ts` exports `ANALYST_SYSTEM_PROMPT`.
  - `databricks-auth.ts` exports `getToken({noCache}: {noCache?: boolean})`.
  - `databricks-chat.ts` exports both `chatTreaty()` (sync) and
    `chatTreatyStream()` (async-generator).
- `src/lib/dbx-chat.ts` and `src/lib/dbx-chat-stream.ts` are deleted or
  become re-export shims.
- `src/app/api/ask/route.ts` and `src/app/api/ask/stream/route.ts` import
  from `@/lib/llm/`.
- The duplicated token-cache helpers in `dbx-chat-stream.ts` are removed.
- `tsc --noEmit` passes; HTTP smoke tests in `docs/SYSTEM_FLOW.md` §8 still
  return 200.

**Priority:** P0 (blocks AI-002, AI-003, AI-004)

---

### AI-002 — Response cache + per-org token budget

**Goal.** Don't pay the gateway twice for the same question. Don't let a
single client run up the bill.

**Acceptance criteria:**

- New `src/lib/llm/cache.ts` exports `lookup(key)` / `store(key, value, ttl)`.
- Default backend is in-memory LRU (size cap 1000 entries) — swappable for
  Redis (Upstash) via `LLM_CACHE_BACKEND=redis` env var.
- Cache key = `sha256(model || system || JSON.stringify(messages))`.
- `chatTreaty()` and `chatTreatyStream()` check the cache before calling
  the gateway; on cache hit, return immediately (stream emits a synthetic
  series of "content" chunks for client compatibility).
- Cache TTL configurable per request (`?cache=no-store` opts out).
- Per-org monthly token budget tracked in a `TokenUsageLedger` table (org,
  date, prompt_tokens, completion_tokens). HTTP 429 when over.
- New `/admin/usage` route shows usage by org (auth-gated — depends on SEC-001).
- Documented in `docs/LLM_PROMPT_GUIDE.md`.

**Priority:** P1 (blocked by AI-001)

---

### AI-003 — Databricks service-principal M2M auth path

**Goal.** Production deploys must not depend on the `databricks` CLI being
on `PATH`, nor on a personal access token.

**Acceptance criteria:**

- `src/lib/llm/databricks-auth.ts` adds a `fetchTokenViaServicePrincipal()`
  branch: POSTs to `${WORKSPACE_HOST}/oidc/v1/token` with
  `client_id` + `client_secret` from env, parses `{access_token, expires_in}`,
  caches under Redis key `dbx:token:<workspace_host>`.
- Auth precedence (first that works): Redis-cached M2M token → fresh M2M
  fetch (env present) → cached U2M token (local dev) → `databricks` CLI
  (local dev) → `DATABRICKS_TOKEN` PAT (legacy).
- `spawnSync('databricks')` is gated on `NODE_ENV !== "production"` to
  prevent the CLI being called at all in prod.
- `.env.example` includes `DATABRICKS_CLIENT_ID`, `DATABRICKS_CLIENT_SECRET`.
- Documented step-by-step in `docs/DEPLOY.md`.
- Smoke test: with M2M env vars set + no cache file + no CLI binary, the
  `/api/ask` round-trip succeeds.

**Priority:** P1 (blocked by AI-001)

---

### AI-004 — Evidence retrieval (RAG) over the corpus, not just the picked project

**Goal.** When a user asks "what does Yahey mean for Alberta water licences"
without picking a project, the LLM context should still include the relevant
evidence items — pulled by retrieval, not by manual slug selection.

**Acceptance criteria:**

- New `src/lib/llm/retrieval.ts` implements a `retrieveEvidence(query)`
  helper that returns the top-K most relevant `EvidenceItem` records.
- v1 strategy: BM25 (lunr.js or minisearch) over `title + plainSummary +
supports[] + tags[]` — no embeddings, no external vector store.
- v2 strategy (separate ticket, mention in description): pgvector over
  embedded `plainSummary` + `supports[]`.
- Both `/api/ask` routes call `retrieveEvidence()` when `context` is empty
  and inline the top 5 results into the user message.
- The system prompt instructs the model to cite by slug from those results.
- A new `?retrieve=false` flag disables for users who want to control context.
- Round-trip latency for `/api/ask` increases by <300ms with retrieval on.
- Added a manual eval set in `docs/research-notes/eval/ask-eval.jsonl` with
  10 hand-graded Q&A pairs and a baseline win-rate.

**Priority:** P1 (blocked by AI-001, DATA-001)

---

## Epic 4 — UI (3 issues)

### UI-001 — Error boundaries + loading states on every page

**Goal.** A bad chart prop or a slow DB call never produces a white screen.

**Acceptance criteria:**

- Add `error.tsx` next to every `src/app/*/page.tsx`. Renders a styled
  "Something went wrong" card with a "Try again" button + the error message
  in `dev` only.
- Add `loading.tsx` next to every server-rendered page. Renders the
  appropriate `<Skeleton>` (already in `src/components/ui/skeleton.tsx`).
- Recharts components are wrapped in a `<ChartErrorBoundary>` HOC that
  catches render errors and shows a fallback ("Could not render this chart").
- Manually trigger an error in one route to verify the boundary renders,
  not the dev overlay.

**Priority:** P1

---

### UI-002 — Persist `/ask` transcripts across sessions

**Goal.** Refresh the page; don't lose the conversation.

**Acceptance criteria:**

- New `Session` + `Turn` tables in Prisma; one `Session` per anonymous
  cookie, multiple `Turn` records per session.
- `/api/sessions` (GET list, POST new, DELETE single, GET `:id` to load).
- `/ask` page reads `?session=<id>` query param on mount; if absent, creates
  a new session.
- Each `submit()` in `ask-form.tsx` writes a `Turn` row via the API after
  the response lands.
- Sidebar gains a "Recent" section under "Tools" listing the last 10 sessions
  (auth-gated once SEC-001 lands — for now scoped to the anonymous cookie).
- Sessions auto-expire 30 days after last activity (background sweep).

**Priority:** P1 (blocked by SEC-001 for auth scoping, but the anonymous-cookie
v1 can ship independently)

---

### UI-003 — Accessibility audit + high-contrast theme alternative

**Goal.** WCAG 2.1 AA conformance. The terminal aesthetic stays as default
but isn't the only option.

**Acceptance criteria:**

- `axe-core` integrated in a Playwright smoke test; CI fails on any
  violation of "serious" or "critical" severity.
- Existing violations triaged: each gets either a fix in this PR or a
  follow-up ticket.
- A "View" menu in the TopBar offers Default / High-Contrast / Light themes;
  selection persists via cookie.
- High-Contrast theme uses tokens with ≥7:1 contrast ratio, larger fonts
  (14px+), and respects `prefers-reduced-motion` (disables cobe globe spin
  and pulsing prompt arrow).
- Light theme is a legitimate alternative, not just `dark` flipped.
- Documented in `docs/ACCESSIBILITY.md` with screenshots.

**Priority:** P1

---

## Epic 5 — Reports (2 issues)

### RPT-001 — Replace static-PNG `/reports` with live charts

**Goal.** `/reports` becomes a live dashboard, not a museum of PNGs from
`C:\Claude\viz\`.

**Acceptance criteria:**

- `src/app/reports/page.tsx` no longer references `public/xref_*.png`.
- Three sections rendered server-side from the aggregations helpers:
  - "Per-project citations" — reuses `<PerProjectCitationChart>`.
  - "Top-cited evidence" — reuses `<TopCitedEvidenceChart>`.
  - "Source × reliability heatmap" — reuses `<SourceReliabilityHeatmap>`.
- A "Methodology" panel explains how each chart is computed.
- Static PNGs removed from `public/` (REPO_MAP §11 → Remove).
- `C:\Claude\viz\treaty_lab_xref.py` retired (mention in commit body).

**Priority:** P2 (blocked by DATA-001 for performance — once data is in
Postgres, server-side computation is fast enough to render live)

---

### RPT-002 — On-demand `.docx` export of a project assessment

**Goal.** A user can click "Export" on `/projects/[slug]` and download a
formatted Word document with the full assessment, claims grouped by kind,
finance block, primary sources with citations, and an evidence appendix.

**Acceptance criteria:**

- New `POST /api/reports/project/[slug].docx` returns a `.docx` byte stream.
- Implementation uses `docx` (already familiar from the
  `anthropic-skills:docx` skill); template lives at
  `src/lib/reports/project-template.ts`.
- Document includes: title page, status/proponent/jurisdictions block,
  claims sections (color-coded by `kind`), finance block, sources table
  with hyperlinked `url` fields, generated-on timestamp, "not legal /
  investment advice" disclaimer.
- File is rendered via Tailwind-equivalent typography (Calibri 11, headings
  black, table styling per `docs/` style of prior `.docx` reports).
- File naming: `treaty-lab-{slug}-{YYYY-MM-DD}.docx`.
- Frontend button on `/projects/[slug]` triggers a download.
- Adds `docx` to runtime dependencies.

**Priority:** P2

---

## Epic 6 — Security (3 issues)

### SEC-001 — Auth on `/api/ask` (and the rest of the app) ✅ Completed (magic-link/auth hardening, PR #55/#56)

**Goal.** No more "anyone who can reach the dev server can spend gateway
tokens." Pick a provider, wire it in, gate every route that costs money or
exposes content.

**Acceptance criteria:**

- Auth provider chosen + documented in `docs/DEPLOY.md` (recommended:
  Auth.js with Postgres adapter — fewest moving parts).
- `User`, `Account`, `Session`, `VerificationToken` Prisma models added.
- Email magic-link sign-in works end-to-end against a dev SMTP server
  (Ethereal or Mailpit).
- Middleware in `src/middleware.ts` protects all routes except `/`, `/login`,
  `/api/auth/*`, and static assets. Unauth'd users redirect to `/login?next=…`.
- `/api/ask` and `/api/ask/stream` require an authenticated session; return
  401 otherwise.
- Sign-out button in the TopBar dropdown.
- An "Org" model groups users — every `TokenUsageLedger` and `Session` row
  carries an `orgId`.

**Priority:** P0 (blocks DATA-003, AI-002 budget tracking, UI-002 cross-device)

---

### SEC-002 — Rate-limit middleware on chat routes

**Goal.** Single-actor abuse can't burn the monthly budget.

**Acceptance criteria:**

- Token-bucket rate limit on `/api/ask` and `/api/ask/stream`:
  - 10 req/min per user (default).
  - 100 req/hour per org.
- Implementation uses Upstash `@upstash/ratelimit` against the same Redis
  used by AI-002's response cache. Falls back to in-memory bucket if Redis
  env is absent (dev mode).
- 429 response includes `Retry-After` header.
- `ChatPanel` and `/ask` surface the 429 as a styled toast, not a raw error.
- Limits configurable per-org via a `Quota` table (admin-only edit).

**Priority:** P1 (blocked by SEC-001)

---

### SEC-003 — Security headers + Content Security Policy

**Goal.** Default-deny security headers on every response. No inline scripts
that aren't explicitly allowed.

**Acceptance criteria:**

- `next.config.ts` defines a `headers()` block returning, for `/(.*)`:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Content-Security-Policy: default-src 'self'; img-src 'self' data:;
 script-src 'self' 'nonce-…'; style-src 'self' 'unsafe-inline';
 connect-src 'self' https://*.databricks.com; font-src 'self' data:;
 frame-ancestors 'none'`.
- Next.js' built-in nonce flow used for any inline scripts (Recharts, cobe).
- `SECURITY.md` (from FND-001) documents the policy.
- An `observatory.mozilla.org` or `securityheaders.com` scan of the deployed
  preview returns grade A or better.

**Priority:** P1

---

## Epic 7 — Deployment (2 issues)

### DPL-001 — Dockerfile + deploy target (Fly.io or Render or Vercel)

**Goal.** `git push main` produces a running production URL. No manual
machine setup.

**Acceptance criteria:**

- `Dockerfile` (multi-stage: deps → build → runtime). Final image ≤ 250 MB.
  Runs `next build` in build stage; runtime stage runs `node server.js`
  (Next standalone output).
- `next.config.ts` opts into `output: "standalone"`.
- Deploy target chosen + documented in `docs/DEPLOY.md`:
  - **Fly.io** (recommended): `fly.toml`, secrets via `flyctl secrets set`,
    Postgres via Fly Postgres, Redis via Upstash.
  - Or **Vercel** with Neon Postgres + Upstash Redis.
- `.github/workflows/deploy.yml` deploys on push to `main` after CI passes
  (depends on FND-002).
- Health endpoint `GET /api/healthz` returns `{status, db: "ok"|"down",
gateway: "ok"|"down"}` and is wired to the platform's health check.
- DEPLOY.md covers: first-time setup, secret rotation, database backup,
  rollback.

**Priority:** P1 (blocked by FND-002, SEC-001, AI-003)

---

### DPL-002 — OpenTelemetry tracing + structured logging

**Goal.** When `/api/ask` is slow, the trace shows whether it's the gateway,
the retrieval, the DB query, or the network.

**Acceptance criteria:**

- `@opentelemetry/api`, `@opentelemetry/sdk-node`, `@opentelemetry/exporter-trace-otlp-http`
  added.
- OTel SDK initialized in `instrumentation.ts` (Next.js convention).
- Auto-instrumentation for Node HTTP + `fetch`; manual spans for:
  `chatTreaty.gateway-call`, `chatTreatyStream.gateway-call`,
  `retrieveEvidence`, `prisma.<model>.<op>`.
- Span attributes: `org_id`, `user_id`, `model`, `prompt_tokens`,
  `completion_tokens`, `cache_hit`.
- `pino` for app logs; JSON output in prod, pretty-print in dev.
- OTel exporter configurable via env vars: `OTEL_EXPORTER_OTLP_ENDPOINT`,
  `OTEL_SERVICE_NAME="treaty-lab"`.
- Documented in `docs/RUNBOOK.md` with example queries against Grafana Cloud
  / Honeycomb / Datadog (pick one).

**Priority:** P2 (blocked by DPL-001)

---

## Backlog summary

| Epic       | Issues | P0               | P1                     | P2               |
| ---------- | ------ | ---------------- | ---------------------- | ---------------- |
| Foundation | 3      | FND-001, FND-002 | —                      | FND-003          |
| Database   | 3      | DATA-001         | DATA-002, DATA-003     | —                |
| AI / RAG   | 4      | AI-001           | AI-002, AI-003, AI-004 | —                |
| UI         | 3      | —                | UI-001, UI-002, UI-003 | —                |
| Reports    | 2      | —                | —                      | RPT-001, RPT-002 |
| Security   | 3      | SEC-001          | SEC-002, SEC-003       | —                |
| Deployment | 2      | —                | DPL-001                | DPL-002          |
| **Total**  | **20** | **5**            | **10**                 | **5**            |

### Critical path

```
FND-001 (cleanup)
    ↓
FND-002 (CI) ──────────────────────────────────────┐
    ↓                                              │
AI-001 (de-dup token + prompt) ───┐                │
    ↓                             │                │
DATA-001 (Postgres + content) ────┤                │
    ↓                             │                │
SEC-001 (auth) ───────────────────┴────────────────┤
    ↓                                              │
DATA-002, DATA-003, AI-002, AI-003, AI-004,        │
UI-001, UI-002, UI-003, RPT-001, RPT-002,          │
SEC-002, SEC-003                                   │
    ↓                                              │
DPL-001 ◄──────────────────────────────────────────┘
    ↓
DPL-002
```

Five P0s in the critical path. Once those land, the ten P1s and five P2s
can be parallelized across two or three contributors.

> **Re-baseline (2026-06-03):** all five P0s have since landed — see the Status
> banner at the top of this document. v0.3 is complete; v0.4 (Evidence Operations)
> is underway via the AUDIT slices.

---

_Last updated: 2026-06-03 (status re-baseline; original plan dated 2026-05-27).
Re-prioritize after each sprint based on what actually shipped vs. what surfaced
as the next-most-urgent blocker._
