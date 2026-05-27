# Treaty-Lab — Architecture

> **Scope.** This document describes the current architecture of Treaty-Lab as it
> exists in this repository on 2026-05-27. It is descriptive, not aspirational —
> what's actually deployed locally, with every file path you can grep for.
> A separate section at the bottom describes the recommended production
> architecture, which is **not** built today.

Companion documents:

- **`SYSTEM_FLOW.md`** — request/response flow for every page and API route.
- **`DATABASE_SCHEMA.md`** — the relational schema (SQLite + Prisma) and the
  parallel JSON content store.

---

## 1. One-paragraph summary

Treaty-Lab is a Next.js 16 / React 19 intelligence terminal with two parallel
data backbones: (a) a hand-curated **JSON content store** under `src/content/`
holding 4 projects, 48 evidence items, 37 indicators, 7 explainers, and 4
domain modules — all keyed by slug and cross-validated; and (b) a relational
**SQLite database** managed by Prisma 7, holding the Treaty Archive's
~30 historical treaties with parties, signatures, and topics. A server-side
**chatbot orchestration layer** packs context out of the JSON store, calls the
Databricks AI Gateway's `treaty` serving endpoint (`gpt-oss-120b-080525`), and
streams the answer back. Everything runs locally today on the Next.js dev
server; nothing is deployed.

---

## 2. Frontend

### Stack

| Layer | Choice | Version |
|-------|--------|---------|
| Framework | Next.js (App Router, Turbopack) | 16.2.6 |
| UI library | React + Server Components | 19.2.4 |
| Styling | Tailwind CSS v4 + tw-animate-css | 4.x |
| Component primitives | shadcn (Radix-based) + Base UI | 4.8.0 / 1.5.0 |
| Charts | Recharts | 3.8.1 |
| 3D / globe | cobe | 2.0.1 |
| Tree layouts | d3-hierarchy | 3.1.2 |
| Markdown | react-markdown + remark-gfm | 10.1.0 / 4.0.1 |
| Icons | lucide-react | 1.16.0 |
| Fonts | next/font/google: Inter + JetBrains Mono | — |
| Type system | TypeScript (strict) | 5.x |

### Layout

`src/app/layout.tsx` defines the root shell:

```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar (260px)        TopBar                              │
│                  ┌──────────────────────────────────────┐   │
│  Intelligence    │                                      │   │
│   · Command…     │           <main>{children}</main>    │   │
│   · Treaty       │                                      │   │
│   · Water        │                                      │   │
│   · Energy       │                                      │   │
│   · Finance      │                                      │   │
│                  │                                      │   │
│  Research        │                                      │   │
│   · Projects     │                                      │   │
│   · Evidence     │                                      │   │
│   · Sources      │                                      │   │
│   · Explainers   │                                      │   │
│   · Archive      │                                      │   │
│                  │                                      │   │
│  Tools           │                                      │   │
│   · Ask (LLM)    │                                      │   │
│   · Reports      │                                      │   │
└─────────────────────────────────────────────────────────────┘
```

Sidebar nav (`src/components/intel/sidebar.tsx`) groups the 12 routes into
three sections: **Intelligence** (domain modules), **Research** (raw evidence),
**Tools** (LLM Q&A + static reports).

### Page tree

Routes under `src/app/`:

| Route | File | Server / Client |
|-------|------|-----------------|
| `/` | `page.tsx` | Server (Command Center dashboard) |
| `/dashboard` | `dashboard/page.tsx` | Server (KPI tabs) |
| `/treaty`, `/water`, `/energy`, `/finance` | `*/page.tsx` | Server (domain modules) |
| `/projects` | `projects/page.tsx` | Server (index) |
| `/projects/[slug]` | `projects/[slug]/page.tsx` | Server (detail + lineage) |
| `/evidence` | `evidence/page.tsx` | Server (with Sankey + top-cited chart) |
| `/evidence/[slug]` | `evidence/[slug]/page.tsx` | Server (single evidence card) |
| `/sources` | `sources/page.tsx` | Server (reliability heatmap) |
| `/explainers` | `explainers/page.tsx` | Server (FAQ accordion) |
| `/explainers/[slug]` | `explainers/[slug]/page.tsx` | Server (full body) |
| `/archive` | `archive/page.tsx` | Server (treaty table from Prisma) |
| `/archive/[slug]` | `archive/[slug]/page.tsx` | Server (treaty detail) |
| `/ask` | `ask/page.tsx` + `ask/ask-form.tsx` | Server + Client (terminal console) |
| `/reports` | `reports/page.tsx` | Server (static PNGs) |

The Ask page is the only client-heavy surface — `ask-form.tsx` is `"use client"`
and runs the full terminal-styled REPL.

### Component library

`src/components/` is split:

- **`ui/`** — 12 shadcn primitives (Button, Card, Tabs, Accordion, Table, etc.)
- **`intel/`** — 17 domain components: indicator badges, project cards, risk
  cards, source cards, watchlist tables, the cobe globe (`geographic-overview`),
  the d3 lineage tree, four Recharts components (radar, load-growth trend,
  per-project citations, top-cited evidence, source-reliability heatmap,
  citation Sankey).
- **`dashboard/`** — 10 dashboard-specific tiles (KPI cards, treaty timeline,
  party donut, topic bar, severity bar, chat panel, three tabs).

---

## 3. Backend

The "backend" is the Next.js server runtime — there is no separate API tier.
All backend logic lives in:

| Concern | Location |
|---------|----------|
| HTTP API routes | `src/app/api/*/route.ts` |
| Server-side data loaders | `src/lib/content.ts` (re-exports from `src/lib/content/`) |
| Prisma client singleton | `src/lib/db.ts` |
| Databricks AI Gateway client | `src/lib/dbx-chat.ts` (sync) + `src/lib/dbx-chat-stream.ts` (SSE) |
| Aggregation / chart-data prep | `src/lib/content/aggregations.ts` |
| Content cross-reference validators | `src/lib/content/validators.ts` |
| Dashboard mock data | `src/lib/dashboard-data.ts` |
| Type schemas | `src/lib/content/types.ts` |

### API routes

Only two HTTP endpoints today, both POST:

- **`POST /api/ask`** (`src/app/api/ask/route.ts`)
  Synchronous chat — request body `{question, context?, reasoning?, maxTokens?,
  temperature?}`, response `{answer, reasoning?, usage, model, contextSummary}`.
  Default `temperature: 0.3`, `maxTokens: 1500`. Calls `chatTreaty()`.

- **`POST /api/ask/stream`** (`src/app/api/ask/stream/route.ts`)
  Streaming chat — same body shape but supports a full `messages[]` array for
  multi-turn. Returns `text/event-stream` with discriminated events:
  `{type: "thought" | "content" | "model" | "usage" | "error" | "done"}`.
  Multi-turn support: client sends full history; server prepends the system
  prompt only if no system message is present.

There is **no** `/api/treaty`, `/api/projects`, `/api/evidence`, etc. — those
collections are read from JSON imports at render time on the server (see §5).
The dashboard treaty table fetches via Prisma in a Server Component.

---

## 4. Database

Two stores, in two different shapes, used for two different purposes:

### Relational (Prisma + SQLite)

File: `dev.db` at repo root (114 KB).
Schema: `prisma/schema.prisma`.
Migrations: `prisma/migrations/20260526002634_init/migration.sql`.
Generator: **prisma-client** (new in Prisma 7) emitting to `src/generated/prisma/`.
Adapter: `@prisma/adapter-better-sqlite3` (Prisma 7 requires driver adapters).

Four models: `Treaty`, `Party`, `Signature`, `Topic` — plus the implicit
many-to-many `_TreatyTopics` join table. See `DATABASE_SCHEMA.md` for the full
ERD, indices, and the seeded row counts.

The Prisma client is a global singleton (`src/lib/db.ts`) to survive Next.js
hot-reload during dev. Production-mode code reuses the same module without the
`globalThis` mutation.

### JSON content store (file-backed, type-checked)

Five hand-authored JSON files under `src/content/`:

| File | Schema (in `types.ts`) | Items | Bytes |
|------|------------------------|-------|-------|
| `evidence.json` | `EvidenceItem` | 48 | 71 KB |
| `projects.json` | `ProjectAssessment` | 4 | 32 KB |
| `indicators.json` | `Indicator` | 37 | 29 KB |
| `explainers.json` | `PlainLanguageExplainer` | 7 | 11 KB |
| `modules.json` | `ModuleConfig` | 4 | 4 KB |

These are imported as ES modules and cast to typed arrays in `src/lib/content.ts`.
At Next.js build time they're inlined into the JS bundle — they're not loaded
at request time.

**Why two stores?** Treaties have a clean, regular shape (party + signature +
topic) that wants a relational schema. Projects, evidence, and indicators are
narrative-heavy, schema-fluid analytical objects with multi-valued tags,
domain-spanning relationships, and per-claim source citations. Putting them in
JSON keeps the editing flow git-friendly and the schema iteratable; cross-
reference integrity is enforced by `validators.ts` rather than foreign keys.

---

## 5. Synthesis system (content store + cross-reference)

The synthesis layer is a pure-functional pipeline over the JSON store:

```
src/content/*.json
        │
        ▼
  src/lib/content.ts                  ← loader + slug lookups
        │
        ├─→ src/lib/content/validators.ts   ← `validateContent()` walks every
        │                                     cross-reference, returns
        │                                     ValidationResult{ok, errors[]}
        │                                     · Used by scripts/check-content.mjs
        │                                       (CI gate via `npm run check`)
        │
        └─→ src/lib/content/aggregations.ts ← 20+ pure functions:
                                              · groupBy / countBy / distinct
                                              · evidenceMap (slug → item)
                                              · topCitedEvidence
                                              · projectCitationsBySourceType
                                              · evidenceCountsBySourceType
                                                  AndReliability
                                              · sankeyEvidenceToProject
                                              · averageSeverityByDomain
                                              · countClaimsByKind…
```

Every chart on every page consumes these aggregations. Charts never talk to
the JSON directly — they call typed helpers. This is why adding a chart is
a one-line lookup, not a data-munging exercise.

### Claim taxonomy

Every claim in a project has a `kind`:

- **fact** — directly attested
- **risk** — inferred concern
- **question** — open
- **assumption** — stated unverified premise
- **needs_validation** — community / legal sign-off pending

This taxonomy is enforced by the `Claim` type and propagates through the LLM
context-pack format (see §6) — the model is told to honor the same labels.

### Validator guarantees

`validateContent()` checks:

- Slug uniqueness within each collection (`project`, `evidence`, `indicator`,
  `explainer`, `module`).
- Every `evidenceSlug` on a project's `primarySources`, on any claim's `sources`,
  and on `finance.sources` resolves to an `EvidenceItem`.
- Every indicator's `sources[].evidenceSlug` resolves.
- Every explainer's `relatedEvidence[]` and `relatedProjects[]` resolves.
- Every module's `featuredProjectSlugs[]` and `featuredIndicatorSlugs[]`
  resolves.

Errors carry a `location` path like
`projects[cedar-lng].firstNationImplications[2].sources[0]` and a `badValue`.

Run `npm run check` → `npm run check:content && tsc --noEmit` to gate.

---

## 6. Chatbot orchestration

The full path of an `/ask` round-trip:

```
Browser (ask-form.tsx)
    │   { question, context?: {projectSlug, domain, indicatorSlugs}, reasoning }
    ▼
POST /api/ask  or  POST /api/ask/stream
    │
    ├── Pack context block from JSON store:
    │     · getProject(slug)      → format claims by kind + sources
    │     · getModule(domain)     → lede + featured projects/indicators
    │     · resolveIndicators()   → full indicator records w/ sources +
    │                                 evidence-item back-references
    │
    ├── Build messages: [{role: "system", content: SYSTEM_PROMPT},
    │                    {role: "user",   content: "## Provided context\n…
    │                                                ## Question\n…"}]
    │
    ▼
chatTreaty()  /  chatTreatyStream()  (src/lib/dbx-chat[-stream].ts)
    │
    ├── Auth precedence (first that works wins):
    │     1. ~/.dbx-token.cache.json  (50-min TTL, host-pinned)
    │     2. `databricks auth token --host <ws>`  (OAuth U2M, local dev)
    │     3. $DATABRICKS_TOKEN env var  (PAT fallback, production)
    │
    ▼
POST {GATEWAY_HOST}/mlflow/v1/chat/completions
    Authorization: Bearer <token>
    body: {model: "treaty", messages, max_tokens, temperature, stream?}
    │
    ▼
Databricks AI Gateway → "treaty" serving endpoint
                       → gpt-oss-120b-080525 (reasoning model)
    │
    │   Response: choices[0].message.content is either string OR
    │             Array<{type:"text"|"reasoning", ...}>
    │
    ▼
Extractor splits content array into:
    · answer    (joined .text segments)
    · reasoning (joined .summary[].text from reasoning segments)
    │
    ▼
Return JSON  (sync route)  or  SSE stream  (stream route)
```

### System prompt

Defined in both route files (duplicated for now). Key directives:

- Audience: First Nation communities, infrastructure investors, legal/policy
  researchers, government-relations teams.
- Separate FACT / RISK / QUESTION / ASSUMPTION / NEEDS_VALIDATION (same
  taxonomy as the `Claim` type).
- Cite evidence by slug: `[evidence: yahey-2021-bcsc-1287]`.
- Plain language; **not investment advice, not legal advice**.
- NRTA + Section 35 + UNDRIP framing is fundamental.

### Streaming details

`dbx-chat-stream.ts` handles three reasoning-channel encodings the gateway
might emit:

- DeepSeek-style `delta.reasoning_content: string`.
- Databricks nested `delta.reasoning: string | {text?, summary?[{text}]}`.
- OpenAI-style structured `delta.content: Array<{type, text|summary}>`.

All three are normalized to `{type: "thought" | "content"}` events.

### Frontend chatbots

Two implementations:

- **`src/app/ask/ask-form.tsx`** — full-page terminal-styled REPL: project +
  domain context selectors, reasoning toggle (TRACE ON/OFF), scrolling
  transcript with per-turn timestamps/badges, react-markdown rendering, per-turn
  usage stats, quick-prompts. Uses non-streaming `/api/ask`.
- **`src/components/dashboard/chat-panel.tsx`** — Command Center chat panel.
  Consumes `/api/ask/stream` (SSE).

---

## 7. Caching

There is **no application-level cache** for evidence, projects, indicators, or
Prisma queries. Three things behave cache-like:

1. **Databricks OAuth token** — `~/.dbx-token.cache.json`. 50-minute TTL,
   host-pinned, shared across all dbx clients (this app, PowerShell helper,
   Node CLI, MCP server, the treaty-terminal Vite middleware). Cache record:
   `{token, expires_at, host, cached_at?}`.

2. **Next.js build-time inlining** — the five `src/content/*.json` files are
   imported as ES modules, so they're frozen into the JS bundle. Editing JSON
   requires a dev-server reload (Turbopack handles it in dev). This is *de
   facto* caching — at request time the content is in RAM, not on disk.

3. **Prisma client singleton** — `src/lib/db.ts` keeps one client per Node
   process via `globalThis.prisma`. This is connection-pool caching, not data
   caching.

There is **no** Next.js Data Cache, **no** Server Action revalidation, **no**
`revalidateTag()`, **no** Redis, **no** memcache, **no** persisted gateway
response cache. Every `/api/ask` call hits the gateway.

---

## 8. Evidence flow (the legal-validity backbone)

This is the part that makes Treaty-Lab not-a-chatbot-toy. Evidence flow is the
end-to-end traceability from a UI claim back to a primary source:

```
EvidenceItem (in evidence.json)
  ├── slug                  ← stable identifier (lowercase-hyphen)
  ├── sourceType            ← court_decision | legislation | treaty_text |
  │                            regulatory_filing | government_report | academic |
  │                            news | ngo_report | corporate_disclosure |
  │                            financial_prospectus
  ├── reliability           ← weak | moderate | strong | established
  ├── tags                  ← multi-valued: law, finance, water, power, …
  ├── supports              ← explicit list of what this source actually proves
  ├── limitations           ← explicit list of what it does NOT prove
  ├── url + citation        ← link out + Bluebook-style cite
  └── plainSummary          ← non-specialist 2-sentence summary
        ▲
        │ referenced via SourceReference{evidenceSlug, citing}
        │
        ├─── ProjectAssessment.primarySources[]
        ├─── ProjectAssessment.firstNationImplications[].sources[]
        ├─── ProjectAssessment.treatyAndWaterRisk[].sources[]
        ├─── ProjectAssessment.financeRisk[].sources[]
        ├─── ProjectAssessment.finance.sources[]
        ├─── Indicator.sources[]
        └─── PlainLanguageExplainer.relatedEvidence[]
```

Three views surface the evidence graph:

- **`/evidence`** — top-cited evidence chart (which sources are doing the most
  work across the corpus), and the source-type → project Sankey (flow of
  evidence into project assessments).
- **`/sources`** — reliability × source-type heatmap (where the corpus is thin
  on hard primary sources, where it leans on news/NGO).
- **`/projects/[slug]`** — per-project citation chart (source-type distribution
  for that project, surfacing claims that lean on weaker evidence).

The validator (`validators.ts`) refuses to compile a build with dangling
`evidenceSlug` references, so the UI cannot ever surface a claim with a broken
provenance chain. The trade-off: every new claim requires its source to exist
in `evidence.json` first.

---

## 9. File structure

```
Treaty-Lab/
├── AGENTS.md                      → "This is NOT the Next.js you know" warning
├── CLAUDE.md                      → @AGENTS.md
├── README.md, SECURITY.md
├── package.json                   → see §11 for dependency breakdown
├── tsconfig.json                  → strict TS, path alias "@/" → src/
├── next.config.ts                 → empty (defaults)
├── prisma.config.ts               → Prisma config (Prisma 7 style)
├── postcss.config.mjs             → Tailwind v4
├── components.json                → shadcn config
├── dev.db                         → SQLite database (114 KB)
├── .env                           → DATABASE_URL, DATABRICKS_HOST, …
│
├── prisma/
│   ├── schema.prisma              → 4 models + many-to-many
│   ├── seed.ts                    → Numbered Treaties + key international
│   └── migrations/
│       └── 20260526002634_init/   → single migration so far
│
├── public/                        → favicon + static assets
│
├── scripts/
│   ├── check-content.mjs          → CI gate: runs validateContent()
│   ├── extract-pdfs.mjs           → batch PDF triage (unpdf)
│   └── chat.ts                    → standalone tsx chat REPL (uses @anthropic-ai/sdk)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx             → root shell: Sidebar + TopBar
│   │   ├── page.tsx               → / (Command Center)
│   │   ├── globals.css            → Tailwind + theme tokens
│   │   ├── dashboard/page.tsx     → /dashboard (KPI tabs)
│   │   ├── treaty/page.tsx        → /treaty
│   │   ├── water/page.tsx         → /water
│   │   ├── energy/page.tsx        → /energy
│   │   ├── finance/page.tsx       → /finance
│   │   ├── projects/{page,[slug]/page}.tsx
│   │   ├── evidence/{page,[slug]/page}.tsx
│   │   ├── sources/page.tsx
│   │   ├── explainers/{page,[slug]/page}.tsx
│   │   ├── archive/{page,[slug]/page}.tsx       → reads from Prisma
│   │   ├── reports/page.tsx                     → static PNGs from /public
│   │   ├── ask/
│   │   │   ├── page.tsx
│   │   │   └── ask-form.tsx                     → terminal-styled REPL
│   │   └── api/ask/
│   │       ├── route.ts                         → POST /api/ask  (sync)
│   │       └── stream/route.ts                  → POST /api/ask/stream (SSE)
│   │
│   ├── components/
│   │   ├── ui/             → 12 shadcn primitives
│   │   ├── intel/          → 17 domain components (cards, charts, globe, …)
│   │   └── dashboard/      → 10 dashboard tiles + chat panel
│   │
│   ├── content/
│   │   ├── evidence.json      48 items
│   │   ├── projects.json       4 items
│   │   ├── indicators.json    37 items
│   │   ├── explainers.json     7 items
│   │   └── modules.json        4 items
│   │
│   ├── lib/
│   │   ├── content.ts                  → public API (re-exports + getters)
│   │   ├── content/types.ts            → all TS types for the JSON store
│   │   ├── content/validators.ts       → cross-reference checker
│   │   ├── content/aggregations.ts     → 20+ pure aggregation helpers
│   │   ├── dashboard-data.ts           → mock dashboard tile data
│   │   ├── db.ts                       → Prisma client singleton
│   │   ├── dbx-chat.ts                 → Databricks gateway client (sync)
│   │   ├── dbx-chat-stream.ts          → Databricks gateway client (SSE)
│   │   └── utils.ts                    → cn() class merger
│   │
│   └── generated/prisma/               → emitted by prisma generate
│       ├── client.ts
│       ├── models.ts, enums.ts, …
│       └── models/{Treaty,Party,Signature,Topic}.ts
│
└── .github/, .work/, .claude/          → tooling
```

---

## 10. Current dependencies

### Runtime (production deps)

| Package | Version | What it does here |
|---------|---------|-------------------|
| `next` | 16.2.6 | App Router, Turbopack, Server Components |
| `react`, `react-dom` | 19.2.4 | UI runtime |
| `@prisma/client` | ^7.8.0 | DB client (used via generated `src/generated/prisma/`) |
| `@prisma/adapter-better-sqlite3` | ^7.8.0 | Required driver adapter for Prisma 7 + SQLite |
| `better-sqlite3` | ^12.10.0 | Native SQLite driver |
| `@base-ui/react` | ^1.5.0 | Unstyled component primitives (used by shadcn) |
| `class-variance-authority`, `clsx`, `tailwind-merge` | — | Tailwind class utilities |
| `cobe` | ^2.0.1 | WebGL globe on `/` |
| `d3-hierarchy` | ^3.1.2 | Tree layout for `ProjectLineageTree` |
| `date-fns` | ^4.3.0 | Date formatting |
| `lucide-react` | ^1.16.0 | Icon set |
| `react-markdown` + `remark-gfm` | 10.1.0 / 4.0.1 | Render assistant markdown in /ask |
| `recharts` | ^3.8.1 | All non-cobe / non-d3 charts |
| `shadcn` | ^4.8.0 | UI primitives CLI runtime |
| `tw-animate-css` | ^1.4.0 | Tailwind animation utilities |
| `@anthropic-ai/sdk` | ^0.99.0 | Used by `scripts/chat.ts` (not by the web app) |

### Dev / build

| Package | Version | What it does here |
|---------|---------|-------------------|
| `typescript` | ^5 | Type-check (`tsc --noEmit` in `npm run check`) |
| `@types/{node,react,react-dom,d3-hierarchy,better-sqlite3}` | — | DefinitelyTyped |
| `tailwindcss` + `@tailwindcss/postcss` | ^4 | Styling |
| `prisma` | ^7.8.0 | Schema migrations, generate |
| `tsx` | ^4.22.3 | `prisma seed` + `npm run chat` |
| `dotenv` | ^17.4.2 | Load `.env` in seed/scripts |
| `unpdf` | ^1.6.2 | PDF triage in `scripts/extract-pdfs.mjs` |

### Overrides

```json
"overrides": {
  "@hono/node-server": "^1.19.13",
  "postcss": "^8.5.10"
}
```

### External services (no SDK, hand-wired via fetch + child_process)

- **Databricks AI Gateway** — `https://7474657386881097.ai-gateway.cloud.databricks.com`
  with workspace host `https://dbc-2bbf7706-fc3d.cloud.databricks.com`, model
  alias `treaty` → `gpt-oss-120b-080525`. OAuth U2M via the `databricks` CLI
  binary (winget install location).

---

## 11. Current weaknesses

Ordered roughly by blast radius if the project went to production tomorrow.

### Auth and secrets

- **No M2M service-principal flow.** `dbx-chat.ts` falls back to
  `DATABRICKS_TOKEN` (a PAT) in production, but doesn't implement OAuth M2M
  with `DATABRICKS_CLIENT_ID` + `DATABRICKS_CLIENT_SECRET`. A production deploy
  needs a service principal, not a personal token.
- **`spawnSync('databricks ...')` at request time.** The current local-dev path
  forks the CLI binary inside an HTTP request handler. In production this
  binary won't exist. The fallback works, but the auth code path branches at
  request time on the presence of a binary — fragile.
- **Token cache lives at `~/.dbx-token.cache.json`** with no file permissions
  hardening. On a multi-tenant host this leaks across users.
- **`SECURITY.md` is the GitHub template** — never customized. There's no
  documented vulnerability-reporting path.
- **No auth on `/api/ask`** — anyone who can reach the dev server can spend
  gateway tokens. Fine for `localhost`; immediately exploitable if exposed.

### LLM orchestration

- **System prompt duplicated** across `app/api/ask/route.ts` and
  `app/api/ask/stream/route.ts`. Two places to drift.
- **Token-cache logic duplicated** across `dbx-chat.ts` and `dbx-chat-stream.ts`
  (the source comment acknowledges it: "duplicated from dbx-chat.ts so this
  module is independent").
- **No response cache.** A user who asks the same question twice pays the
  gateway twice. Even a content-hash-keyed in-memory LRU would help.
- **No request budget / rate limiting.** A pathological client can run up costs.
- **Context-pack size is unbounded** — passing a project with many claims +
  many sources can produce a multi-KB user message and hit `max_tokens`.
- **No retries / backoff** on transient gateway 5xx. One blip = one error to
  the user.
- **No structured logging** — failures are `console.error` only.

### Data layer

- **Two stores, no transactional integrity between them.** A project in
  `projects.json` can reference a treaty slug that doesn't exist in the
  Prisma `Treaty` table, or vice versa — `validators.ts` doesn't cross-check.
- **JSON store edits require a redeploy.** No CMS, no admin UI. Every
  evidence add is a PR.
- **No migration story for content.** If `EvidenceItem` adds a required
  field, all 48 items must be hand-updated.
- **No content versioning.** Once a claim is published, edits silently
  overwrite — there's no audit trail visible in the UI.
- **`dev.db` lives in the repo root.** It's checked in. There's no
  dev-vs-staging-vs-prod database story.
- **No backups.** SQLite file loss = data loss.

### Frontend

- **All pages are server-rendered without explicit caching strategy.** Next.js
  16 default caching is per-route; nothing is opted into `force-dynamic` or
  `revalidate`. Behavior under load is undefined.
- **No loading states on most pages** beyond default Suspense.
- **No error boundaries** for the Recharts components — bad data = white screen.
- **The `/ask` page does not persist transcripts.** Refresh = lose history.
- **No analytics.** No idea what people actually ask.
- **Accessibility audit not run.** The terminal aesthetic uses small mono fonts
  and low-contrast greys that likely fail WCAG AA.

### Build and deploy

- **No deploy target configured.** No Dockerfile, no `vercel.json`, no IaC.
- **No CI.** `.github/` exists but no workflow files are wired to PRs.
- **No e2e tests.** Validator runs at build via `npm run check`; nothing
  exercises the live `/api/ask` path automatically.
- **No image optimization config.** Static PNG reports under `/public` are
  served raw.
- **`next.config.ts` is empty** — no security headers, no CSP, no image domains.
- **Bundle size unmeasured.** cobe + recharts + d3 + react-markdown is heavy
  for a dashboard.

### Observability

- **No tracing.** Can't see why a particular `/ask` was slow.
- **No metrics.** No token-cost dashboard, no per-route latency.
- **No log aggregation.** Stderr only.
- **No uptime / health endpoint.** `/api/healthz` doesn't exist.

### Documentation drift

- **`README.md`** has not kept pace with the additions in the last two weeks
  (Sankey, heatmap, /ask, /reports, dbx-chat). Use this doc as the source of
  truth; refresh the README from it.

---

## 12. Recommended production architecture

This is what Treaty-Lab should look like if it crossed the
research-pilot → live-product line. **Not built today.**

### High-level shape

```
┌──────────────────────────────────────────────────────────────────┐
│                      Cloudflare / Vercel edge                    │
│                                                                  │
│   Static assets (Next.js) ──→ CDN cache                          │
│   /api/* ──→ Edge runtime where possible, Node runtime for       │
│              Prisma + spawnSync-free dbx-chat                    │
└────────────┬─────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────┐
│   Next.js app (Node 22 runtime)                                  │
│                                                                  │
│   · Auth middleware (Clerk / Auth.js / WorkOS)                   │
│   · Rate-limit middleware (Upstash Redis token bucket)           │
│   · Structured logging (pino → Datadog / Honeycomb)              │
│   · OpenTelemetry tracing                                        │
└────────┬───────────────────────────────────┬─────────────────────┘
         │                                   │
         ▼                                   ▼
┌──────────────────┐               ┌────────────────────────────┐
│ Postgres         │               │ Databricks AI Gateway      │
│ (Neon / Supabase)│               │ · M2M OAuth (CLIENT_ID/    │
│                  │               │     CLIENT_SECRET)         │
│ · Treaty schema  │               │ · Token refresh in worker  │
│   (Prisma 7)     │               │ · Per-tenant budget caps   │
│ · Evidence,      │               └────────────────────────────┘
│   Projects, …    │                              │
│   moved out of   │                              ▼
│   JSON           │               ┌────────────────────────────┐
│ · Audit log      │               │ Response cache (Redis)     │
│ · Soft-delete +  │               │   key = sha256(model,      │
│   versioning     │               │             system, user)  │
└──────────────────┘               │   TTL = 24h, manual purge  │
         │                         └────────────────────────────┘
         ▼
┌──────────────────┐
│ S3 / R2          │
│ · PDFs, images   │
│ · Static reports │
│ · Generated docx │
└──────────────────┘
```

### Specific recommendations

1. **Promote evidence/projects/indicators to Postgres.**
   Keep the same TS types as the schema source. Add `created_at`, `updated_at`,
   `created_by`, `version`, `soft_deleted_at`. Replace `validators.ts` with
   real foreign keys + check constraints. Build a small admin UI behind auth
   for the content team.

2. **Drop SQLite from the prod path.** Use it only for local dev or `npx
   prisma migrate dev`. Pick one Postgres provider (Neon's branching matches
   the iterative-content workflow well).

3. **Auth.** Pick a hosted provider (Auth.js with Postgres adapter, or Clerk,
   or WorkOS). Gate `/api/ask` behind it. Add an org/team model so different
   reviewers see different content scopes.

4. **Databricks auth via service principal.**
   - Remove `spawnSync('databricks')` from the request path.
   - Add `getServicePrincipalToken()` that POSTs to
     `${WORKSPACE_HOST}/oidc/v1/token` with `client_id/client_secret`,
     caches the result in Redis (with `expires_in` from the response), and
     refreshes asynchronously.
   - Move the token cache out of `~/` into Redis with a per-tenant key.

5. **Rate limit + budget caps.**
   - Per-IP, per-user, per-org limits on `/api/ask` and `/api/ask/stream`.
   - Per-org monthly token budget tracked from `usage.total_tokens`.
   - 429 with a clear error when over.

6. **Response cache.**
   - Key: `sha256(model || system || JSON.stringify(messages))`.
   - Store in Redis with 24h TTL.
   - Add a `cache: "no-store"` flag for users who want fresh.

7. **Streaming everywhere.** The dashboard chat panel already streams;
   `/ask` should too. Drop `/api/ask` (sync) once the client is migrated.

8. **De-duplicate.**
   - Move the system prompt to `src/lib/llm/prompts.ts`.
   - Move the token cache + gateway call to `src/lib/llm/databricks.ts` with
     a single `chat({stream}: {stream: boolean})` entry point.

9. **Multi-turn at the server.** Persist sessions in Postgres (or Upstash
   Redis with TTL) so refresh doesn't drop the transcript. Add `/api/sessions`
   for list / load / delete.

10. **Observability.**
    - OpenTelemetry exporter (Datadog / Honeycomb / Grafana Cloud).
    - Custom span attributes: `tenant_id`, `model`, `prompt_tokens`,
      `completion_tokens`, `cache_hit`.
    - `pino` for app logs; structured JSON.
    - `/api/healthz` (DB ping + gateway ping).

11. **CI/CD.**
    - GitHub Actions: `npm ci`, `npm run check`, `npm run build`, Prisma
      migrate diff, e2e smoke against a preview env.
    - Branch deploys per PR (Vercel / Cloudflare).
    - Blocked merge if `validateContent()` fails or if `tsc --noEmit` fails.

12. **Security headers + CSP.**
    - Next.js `headers()` config: HSTS, CSP, X-Frame-Options, Referrer-Policy.
    - Lock `connect-src` to the gateway + self.
    - Customize `SECURITY.md` with a real reporting address.

13. **Backups.**
    - Provider-managed Postgres snapshots (Neon does branching; equivalent
      elsewhere).
    - Periodic logical export to S3 / R2 for the evidence corpus.
    - Document RTO/RPO.

14. **Cost guard.**
    - Daily token spend digest emailed to ops.
    - Alarm at 80% of monthly budget.
    - Auto-disable LLM routes at 100%.

15. **Accessibility.**
    - Run axe-core in CI.
    - Add `prefers-reduced-motion` honoring to cobe + animated chips.
    - Provide a high-contrast theme alternative to the terminal aesthetic.

---

*Last updated: 2026-05-27. If you add a new module, route, or external
dependency, update this document in the same PR.*
