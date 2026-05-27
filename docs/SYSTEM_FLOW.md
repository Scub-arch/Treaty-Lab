# Treaty-Lab — System Flow

> Companion to `ARCHITECTURE.md`. This document traces every user-facing
> interaction end-to-end: which files run, in what order, with which inputs
> and outputs. Use this when debugging "why is X slow" or "where does Y come
> from".

---

## 0. Process model

A single Next.js server process holds:

- The Node HTTP listener (Next App Router runtime).
- A single Prisma client (singleton in `src/lib/db.ts`, attached to
  `globalThis.prisma` in dev to survive hot-reload).
- The five `src/content/*.json` modules, frozen into the JS bundle at build
  time and held in RAM.
- A connection to the local SQLite file `./dev.db` via `better-sqlite3`.
- No background workers, no queues, no Redis.

All routes are SSR by default. There is no client-only fetch layer for app
data — only the chatbot routes use client-side fetch.

---

## 1. Cold-start sequence

```
$ npm run dev
    ↓
next dev (Turbopack)
    ↓
load src/app/layout.tsx
    ↓
import "@/components/intel/sidebar"   (client component, sent to browser)
import "@/components/intel/top-bar"
    ↓
First request hits / (Command Center)
    ↓
src/app/page.tsx runs as Server Component:
    · imports src/lib/content (loads all 5 JSON files into module-scope arrays)
    · imports src/lib/dashboard-data
    · imports Recharts + intel/* components
    ↓
HTML streamed to browser; client hydrates Sidebar + TopBar + any client chunks
```

After the first request, all JSON content is held in process RAM and never
re-read. Editing `src/content/projects.json` triggers a Turbopack module
invalidation and re-render.

---

## 2. Page render flows

### 2.1 / (Command Center)

```
GET /
  → src/app/page.tsx (Server)
      ├─ getProjects()     ← src/lib/content.ts → projects.json
      ├─ getIndicators()   ← src/lib/content.ts → indicators.json
      ├─ getEvidence()     ← src/lib/content.ts → evidence.json
      │
      ├─ aggregations:
      │   averageSeverityByDomain(indicators)  → radar data
      │   countClaimsByKindAcrossProjects(projects)
      │   countByReliability(evidence)
      │
      └─ render: <RadarOverview>, <GeographicOverview> (cobe),
                 <IndicatorBadge>×N, KPI tiles
```

Cobe globe is a client component; everything else is server-rendered.

### 2.2 /treaty, /water, /energy, /finance (domain modules)

All four follow the same shape via `src/components/intel/module-page.tsx`:

```
GET /{domain}
  → src/app/{domain}/page.tsx (Server)
      ├─ getModule(domain)                  ← module config (lede, featured slugs)
      ├─ resolveProjects(module.featuredProjectSlugs)
      ├─ resolveIndicators(module.featuredIndicatorSlugs)
      └─ render <ModulePage>:
          · ModuleHeader (lede)
          · Featured indicators grid
          · Featured project cards
          · IntelligencePanel sections
```

### 2.3 /projects (index)

```
GET /projects
  → src/app/projects/page.tsx (Server)
      ├─ getProjects()
      ├─ getEvidence(); evidenceMap(evidence)
      └─ render:
          · Project cards (status, location, evidenceConfidence)
          · <PerProjectCitationChart>   ← projectCitationsBySourceType()
                                           per project, fed to Recharts
```

### 2.4 /projects/[slug]

```
GET /projects/cedar-lng
  → src/app/projects/[slug]/page.tsx (Server)
      ├─ getProject(slug)             → ProjectAssessment
      ├─ getEvidence(); evidenceMap()
      ├─ allClaimsForProject(p)       → flat claim list
      ├─ countClaimsByKind(claims)    → fact/risk/question/… tile
      │
      └─ render:
          · Project header (proponent, status, jurisdictions)
          · Claim sections by kind (color-coded badges)
          · <ProjectLineageTree>   ← d3-hierarchy SVG of parties + sources
          · Finance block
          · Primary-sources list with links into /evidence/[slug]
```

### 2.5 /evidence (index)

```
GET /evidence
  → src/app/evidence/page.tsx (Server)
      ├─ getEvidence(), getProjects(), getIndicators(), getExplainers()
      ├─ evidenceMap(evidence)
      │
      ├─ aggregations:
      │   topCitedEvidence(projects, indicators, explainers, map, 15)
      │       → <TopCitedEvidenceChart> (Recharts horizontal bar)
      │   sankeyEvidenceToProject(projects, map)
      │       → <CitationSankey> (Recharts Sankey, custom node/link renderers)
      │
      └─ render:
          · Filter chips (sourceType, reliability, tag)
          · Top-cited chart + Sankey
          · Evidence card list (linked to /evidence/[slug])
```

### 2.6 /evidence/[slug]

```
GET /evidence/yahey-2021-bcsc-1287
  → src/app/evidence/[slug]/page.tsx (Server)
      ├─ getEvidenceItem(slug)
      └─ render full <SourceCard>: title, citation, plainSummary,
                                    supports[], limitations[], reliability tier,
                                    sourceType, link out, tags
```

### 2.7 /sources

```
GET /sources
  → src/app/sources/page.tsx (Server)
      ├─ getEvidence()
      ├─ evidenceCountsBySourceTypeAndReliability(evidence)
      │     → 2-D Map<SourceType, Map<EvidenceStrength, number>>
      └─ render <SourceReliabilityHeatmap> (CSS grid heatmap)
                + per-source-type breakdown lists
```

### 2.8 /explainers + /explainers/[slug]

```
GET /explainers
  → src/app/explainers/page.tsx (Server)
      ├─ getExplainers()
      └─ render <Accordion> with 7 expandable cards

GET /explainers/[slug]
  → src/app/explainers/[slug]/page.tsx (Server)
      ├─ getExplainer(slug)
      └─ render Q + shortAnswer + react-markdown body
                + related-evidence links + related-project links
```

### 2.9 /archive (treaty registry — Prisma-backed)

```
GET /archive
  → src/app/archive/page.tsx (Server)
      ├─ prisma.treaty.findMany({
      │     include: { topics: true, signatures: { include: { party: true }}}
      │   })
      └─ render <TreatiesTable>: openedAt, depository, topics, party count

GET /archive/treaty-6-1876
  → src/app/archive/[slug]/page.tsx (Server)
      ├─ prisma.treaty.findUnique({where: {slug}, include: {...}})
      └─ render header + fullText + party list + topic chips
```

This is the **only** path that touches the SQL database at request time.

### 2.10 /reports

```
GET /reports
  → src/app/reports/page.tsx (Server)
      └─ render <img> tags pointing at static PNGs under /public/reports/
         · treaty_evidence_xref.png
         · treaty_topic_distribution.png
         · treaty_lab_corpus_overview.png
```

The PNGs are generated offline by `C:\Claude\viz\treaty_lab_xref.py` (matplotlib),
copied into `/public/reports/`, and served as static assets by Next.js.

### 2.11 /dashboard

```
GET /dashboard
  → src/app/dashboard/page.tsx (Server)
      ├─ getKpiCardData()             ← src/lib/dashboard-data.ts (mock)
      ├─ prisma.treaty.findMany(...)  for treaty-timeline + party-donut charts
      │
      └─ render Tabs:
          · KPIs tab (KpiCard×N)
          · Treaties tab (TreatyTimelineChart, TreatyPartyDonut, TreatyTopicBar)
          · Resources tab
          · Evidence tab
        + <ChatPanel> (client component, streams from /api/ask/stream)
```

---

## 3. Chatbot flows

### 3.1 /ask page → POST /api/ask (synchronous)

This is the full-page terminal-styled REPL.

```
User types question in <textarea>, presses Enter
    │
    ▼
ask-form.tsx submit():
    setCmd(""); setTurns(prev => [...prev, {id, question, projectSlug,
                                            domainSlug, reasoning, startedAt}])
    ▼
fetch("/api/ask", {
  method: "POST",
  body: JSON.stringify({
    question,
    context: {projectSlug?, domain?},
    reasoning: includeReasoning  // controls whether to return trace
  })
})
    ▼
src/app/api/ask/route.ts POST handler:

    1. Parse + validate body
    2. Build context block from JSON store:
         if (projectSlug) → formatProjectContext()
         if (domain)      → formatDomainContext()
         if (indicators)  → formatIndicatorsContext()
    3. Build messages = [
         {role:"system", content: SYSTEM_PROMPT},
         {role:"user",   content: "## Provided context\n…\n## Question\n…"}
       ]
    4. chatTreaty(messages, {maxTokens:1500, temperature:0.3})
         ▼
       src/lib/dbx-chat.ts chatTreaty():
         · token = getToken()
             → cached?  → return
             → CLI?     → spawnSync('databricks auth token --host …')
                          parse JSON, saveCachedToken(), return
             → env?     → return DATABRICKS_TOKEN
         · POST {GATEWAY}/mlflow/v1/chat/completions
             headers: Authorization: Bearer <token>
             body: {model:"treaty", messages, max_tokens, temperature}
         · Parse choices[0].message.content:
             string → answer = content
             array  → answer = .filter(text).map(.text).join("\n")
                      reasoning = .filter(reasoning)…
         · return {answer, reasoning?, usage, model}
    5. Return NextResponse.json({
         answer, reasoning?, usage, model, contextSummary
       })
    ▼
Browser receives {answer, reasoning?, usage, model, contextSummary}
    ▼
ask-form.tsx setTurns(prev => prev.map(t =>
    t.id===id ? {...t, response, finishedAt, durationMs} : t
))
    ▼
<MarkdownAnswer text={answer}/> renders via react-markdown + remark-gfm
    with terminal-styled component overrides:
      headings → emerald uppercase
      bullets  → emerald markers
      code     → mono on dark
      tables   → bordered, emerald header
      blockquotes → amber accent
```

Typical latency: 5–20 s end-to-end for the reasoning model.
Typical token usage: 300 prompt + 50–500 completion.

### 3.2 /dashboard ChatPanel → POST /api/ask/stream (SSE)

```
User submits in <ChatPanel> (client component)
    │
    ▼
fetch("/api/ask/stream", {
  method: "POST",
  body: JSON.stringify({
    messages: [...currentTurnHistory, {role:"user", content: input}]
    // OR question+context for single-turn convenience
  })
})
    ▼
src/app/api/ask/stream/route.ts POST handler:

    1. Parse body; build messages[] (prepend system prompt if missing)
    2. If body.question, fold into final user turn with context block
    3. Validate user message present
    4. Return new Response(ReadableStream)
         where the stream is fed by:
            for await (ev of chatTreatyStream(messages, {…})):
                controller.enqueue(`data: ${JSON.stringify(ev)}\n\n`)
    ▼
src/lib/dbx-chat-stream.ts chatTreatyStream():
    · token = getToken()
    · POST {GATEWAY}/…/chat/completions  with  stream: true
    · for each SSE event in r.body.getReader():
        parse data: lines, JSON.parse each chunk, narrow:
          delta.content (string)            → yield {type:"content", text}
          delta.content (array of segments) → yield content + thought
          delta.reasoning_content (string)  → yield {type:"thought", text}
          delta.reasoning (string|obj)      → yield thoughts
          chunk.model first seen            → yield {type:"model", model}
          chunk.usage                       → yield {type:"usage", usage}
        on stream end: yield {type:"done"}
    ▼
Browser <ChatPanel> reads SSE via fetch().body.getReader():
    decoder.decode → split by "\n\n" → parse data: lines → switch on type:
      "model"   → display in header chip
      "thought" → append to <details> reasoning trace
      "content" → append to live answer (incremental rendering)
      "usage"   → display in footer
      "error"   → red alert
      "done"    → close stream, lock input
```

Typical latency to first byte: 1–3 s. Total stream duration: 5–20 s.

### 3.3 System prompt (both routes)

Defined identically in both route files (this is the duplication noted in
ARCHITECTURE.md §11):

```
You are an analyst-Q&A assistant for the Treaty-Lab platform — a research-pilot
intelligence terminal covering Canadian treaty rights, water, energy infrastructure,
and Indigenous finance. Your audience is First Nation communities, infrastructure
investors, legal/policy researchers, and government-relations teams.

Core principles:
1. Separate FACT (directly attested) from RISK (inferred concern), QUESTION (open),
   ASSUMPTION (stated unverified), and NEEDS_VALIDATION (community/legal sign-off pending).
2. Cite evidence by slug when context is provided — e.g. '[evidence: yahey-2021-bcsc-1287]'.
3. Plain language — no jargon for community readers; technical precision for analysts.
4. Honor the rule: NOT investment advice, NOT legal advice — this is research synthesis.
5. When evidence is missing or contested, say so explicitly. Don't manufacture certainty.
6. NRTA + Section 35 + UNDRIP framing is fundamental — the legal regime is contested.

(Stream route only)
Format responses as Markdown. Use headings, lists, and emphasis. Cite by evidence slug.
```

### 3.4 Context-pack format

When the user picks a project (`projectSlug`), the route inlines this block
into the user message:

```
## Provided context

### Project: <name> (<slug>)
Status: <status> · Location: <location> · Jurisdictions: <jurisdictions>
Proponent: <proponent>
Summary: <summary>
Government objective: <governmentObjective>
Proponent objective: <proponentObjective>
Evidence confidence: <evidenceConfidence>

Claims:
- [FACT] <text> (sources: <slug1>, <slug2>)
- [RISK] <text> (sources: <slug3>)
- [QUESTION] <text>
- [ASSUMPTION] <text>
- [NEEDS_VALIDATION] <text> (sources: <slug4>)

Finance structure: <structure>
Cost estimate: <totalCostEstimate>
Risk carrier: <riskCarrier>

Primary sources: <slug — citing>; <slug — citing>; …

## Question
<user question>
```

Domain context inlines the module lede + featured projects + featured
indicators. Indicators context inlines per-indicator values + sources +
evidence-item back-references with sourceType + reliability.

---

## 4. Auth flow (Databricks AI Gateway)

This is local-dev OAuth U2M. Production needs M2M (see ARCHITECTURE.md §12).

```
First request to /api/ask after server start:

    chatTreaty() → getToken()
       │
       ├─ loadCachedToken(): read ~/.dbx-token.cache.json
       │    if (cache.host === WORKSPACE_HOST &&
       │        cache.expires_at > now) → return cache.token
       │    else → null
       │
       ├─ (cache miss) fetchTokenViaCli():
       │    for exe in [
       │        %LOCALAPPDATA%\Microsoft\WinGet\Links\databricks.exe,
       │        %LOCALAPPDATA%\…\Databricks.DatabricksCLI\databricks.exe,
       │        "databricks"
       │    ]:
       │      r = spawnSync(exe, ["auth", "token", "--host", WORKSPACE_HOST])
       │      if r.status === 0:
       │        parsed = JSON.parse(r.stdout)
       │        if parsed.access_token:
       │          saveCachedToken(parsed.access_token)
       │          return parsed.access_token
       │
       └─ (CLI miss) return process.env.DATABRICKS_TOKEN
            (production-deploy path — currently expects a PAT)
            else throw "No Databricks auth available"

After 50 minutes:
    next call → cache.expires_at <= now → re-run fetchTokenViaCli()
    The CLI itself handles OAuth refresh against the workspace.

Token cache file (~/.dbx-token.cache.json):
    {
      "token": "<long opaque JWT-ish string>",
      "expires_at": 1748382000,        ← unix seconds, 50 min from cache time
      "host": "https://dbc-2bbf7706-fc3d.cloud.databricks.com",
      "cached_at": "2026-05-27T18:30:00.000Z"
    }
```

The cache file is shared verbatim with:

- `C:\Claude\scripts\dbx-chat.ps1` (PowerShell CLI)
- `C:\Claude\scripts\dbx-chat.mjs` (Node CLI)
- `C:\Claude\dbx-mcp-server\` (MCP server `treaty-local`)
- `C:\Users\Owenb\Documents\artifact-build\treaty-terminal\vite.config.ts`
  (Vite middleware for the treaty-terminal app)

A token fetched by any one of them satisfies all five.

---

## 5. Content validation flow

```
$ npm run check
    ↓
npm run check:content && tsc --noEmit
    ↓
node scripts/check-content.mjs
    ↓
imports the compiled src/lib/content/validators.ts (via tsx? esbuild?)
calls validateContent():
    · Build slug Sets: evidenceSlugs, indicatorSlugs, projectSlugs
    · Per-collection checkUniqueSlugs() → push errors
    · For each project, walk:
        · primarySources[].evidenceSlug
        · firstNationImplications[].sources[].evidenceSlug
        · treatyAndWaterRisk[].sources[].evidenceSlug
        · financeRisk[].sources[].evidenceSlug
        · finance.sources[].evidenceSlug
    · For each indicator: sources[].evidenceSlug
    · For each explainer: relatedEvidence[], relatedProjects[]
    · For each module: featuredProjectSlugs[], featuredIndicatorSlugs[]
returns ValidationResult {ok, errors[], inspected}
    ↓
formatValidationReport(result) → multi-line string
    ↓
exit 0 if ok, exit 1 if errors
    ↓
tsc --noEmit
    ↓
exit 0 if no TS errors
```

This is the gate that prevents a dangling `evidenceSlug` from shipping.

---

## 6. Streaming SSE byte layout

For the `/api/ask/stream` route the response is `text/event-stream` with this
shape (one JSON event per `data:` line, blank line between events):

```
data: {"type":"model","model":"gpt-oss-120b-080525"}

data: {"type":"thought","text":"Let me think about the NRTA question…"}

data: {"type":"thought","text":" The Yahey decision held that…"}

data: {"type":"content","text":"## Answer\n\n"}

data: {"type":"content","text":"The Natural Resources Transfer Agreements"}

data: {"type":"content","text":" of 1930 transferred Crown-held minerals"}

data: {"type":"content","text":" and lands to Manitoba, Saskatchewan, and Alberta…"}

data: {"type":"usage","usage":{"prompt_tokens":412,"completion_tokens":287,"total_tokens":699}}

data: {"type":"done"}
```

Response headers:

```
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

`X-Accel-Buffering: no` disables nginx-style proxy buffering so chunks reach
the client immediately. This matters when running behind any reverse proxy.

---

## 7. Failure modes

| Failure | Where it surfaces | Recovery |
|---------|-------------------|----------|
| Databricks auth fails (no cache, no CLI, no env) | `chatTreaty()` throws `"No Databricks auth available…"` | Route returns 502 with the error message in `error` field. UI shows red alert. |
| Gateway 5xx | `chatTreaty()` throws `"Databricks gateway HTTP {status}: {body}"` | 502 to client. No retry. |
| Gateway 4xx (bad model, bad messages) | Same as above. | 502. Inspect message body — usually a validation issue. |
| `getProject(slug)` returns `undefined` | Route silently skips that context block. `contextSummary.projectsCount` stays 0. | UI looks normal; question is sent without the project context. |
| Invalid JSON in request body | Route returns 400 `{error:"Invalid JSON body"}`. | Client should validate before sending. |
| Empty `question` | Route returns 400 `{error:"question is required and must be a string"}`. | Client disables submit button when empty. |
| Token cache write fails | Silently swallowed. Token is still used for the current call. | Next call will refetch from CLI. |
| Prisma can't open `dev.db` | Server startup error. Page renders fail with stack trace. | Run `npx prisma migrate dev` to create. |
| Content JSON has dangling slug | Validator catches at `npm run check`; runtime UI silently drops the reference (the `?? ""` fallback path). | Run validator and fix the JSON. |

---

## 8. End-to-end smoke tests (manual)

```powershell
# 1. Page renders
Invoke-WebRequest http://localhost:<port>/                 # → 200, "Command Center"
Invoke-WebRequest http://localhost:<port>/projects         # → 200, project cards
Invoke-WebRequest http://localhost:<port>/evidence         # → 200, Sankey HTML
Invoke-WebRequest http://localhost:<port>/sources          # → 200, heatmap HTML
Invoke-WebRequest http://localhost:<port>/archive          # → 200, treaty table
Invoke-WebRequest http://localhost:<port>/ask              # → 200, terminal HTML

# 2. /api/ask round-trip
$body = @{ question = "Reply with exactly one word: pong" } | ConvertTo-Json
Invoke-WebRequest http://localhost:<port>/api/ask `
  -Method POST -ContentType "application/json" -Body $body
# Expect HTTP 200 with body {"answer":"pong","usage":{...},"model":"...","contextSummary":{...}}

# 3. /api/ask/stream round-trip
$body = @{ question = "List 3 NRTA-era pressures on Treaty 6" } | ConvertTo-Json
Invoke-WebRequest http://localhost:<port>/api/ask/stream `
  -Method POST -ContentType "application/json" -Body $body
# Expect HTTP 200, Content-Type: text/event-stream, multiple data: lines
```

A failing smoke is usually one of:

- Stale token cache (delete `~/.dbx-token.cache.json` and retry).
- Wrong port (Next.js picks a random port if 3000 is taken).
- `databricks auth login` not run on this machine yet.

---

*Last updated: 2026-05-27.*
