# Treaty-Lab — Database Schema

> Companion to `ARCHITECTURE.md` and `SYSTEM_FLOW.md`. This document covers
> both data stores: the relational SQLite database managed by Prisma, and
> the file-backed JSON content store under `src/content/`.

---

## 0. Two stores, side by side

```
┌───────────────────────────────────────┐   ┌─────────────────────────────────────────┐
│ RELATIONAL (Prisma 7 + SQLite)        │   │ FILE-BACKED JSON (typed, validated)     │
│                                       │   │                                         │
│ Purpose:                              │   │ Purpose:                                │
│   Historical treaty registry — clean, │   │   Narrative-heavy analytical objects    │
│   regular shape with party + sig +    │   │   with multi-valued tags, claim         │
│   topic. Read at request time via     │   │   taxonomies, and cross-file slug       │
│   Server Components.                  │   │   citations. Inlined into JS bundle     │
│                                       │   │   at build time.                        │
│ File:        dev.db (114 KB)          │   │                                         │
│ Schema:      prisma/schema.prisma     │   │ Files:    src/content/*.json            │
│ Migrations:  prisma/migrations/       │   │ Schemas:  src/lib/content/types.ts      │
│ Generator:   prisma-client (Prisma 7) │   │ Loader:   src/lib/content.ts            │
│ Adapter:     @prisma/adapter-         │   │ Validator: src/lib/content/             │
│                better-sqlite3         │   │             validators.ts               │
│ Models:      Treaty, Party,           │   │ Collections: evidence (48),             │
│              Signature, Topic         │   │              projects (4),              │
│              + _TreatyTopics join     │   │              indicators (37),           │
│                                       │   │              explainers (7),            │
│                                       │   │              modules (4)                │
└───────────────────────────────────────┘   └─────────────────────────────────────────┘
```

There is **no foreign key** between the two stores. A project in
`projects.json` may reference treaties conceptually (e.g. "Treaty 8 territory")
in free text, but nothing in the schema connects `ProjectAssessment.slug` to
`Treaty.slug`. This is a known gap (see ARCHITECTURE.md §11).

---

## 1. Relational schema (Prisma + SQLite)

### 1.1 ERD

```
┌────────────────────────────────────┐                ┌──────────────────────────────┐
│ Treaty                             │                │ Topic                        │
├────────────────────────────────────┤                ├──────────────────────────────┤
│ id                  String  PK     │                │ id           String  PK      │
│ slug                String  UNIQUE │                │ slug         String  UNIQUE  │
│ name                String         │                │ name         String          │
│ shortName           String?        │                │ parentId     String? FK ────┐│
│ openedAt            DateTime IDX   │                └──────────────────────────┬───┘│
│ enteredIntoForceAt  DateTime? IDX  │                                           │    │
│ depository          String?        │                  ┌──── self-reference ────┘    │
│ summary             String?        │                  │      (parent → children)    │
│ fullText            String         │                  └─────────────────────────────┘
│ sourceUrl           String?        │
│ createdAt           DateTime       │                ┌──────────────────────────────┐
│ updatedAt           DateTime       │                │ _TreatyTopics  (m2m join)    │
└────────────────────────────────────┘                ├──────────────────────────────┤
        △  1                                          │  A   String  FK → Topic.id   │
        │                                             │  B   String  FK → Treaty.id  │
        │                                             │  UNIQUE(A, B)                │
        │ N                                           │  INDEX(B)                    │
┌──────────────────────────────────────┐              └──────────────────────────────┘
│ Signature                            │                          ▲    ▲
├──────────────────────────────────────┤                          │ N  │ N
│ id           String  PK              │                          │    │
│ treatyId     String  FK IDX ←────────┼──────────────────────────┘    │
│ partyId      String  FK IDX ←────────┼──────────────────────────┐    │
│ signedAt     DateTime? IDX           │                          │    │
│ ratifiedAt   DateTime?               │                          │    │
│ reservation  String?                 │                          │    │
│ createdAt    DateTime                │                          │    │
│ UNIQUE(treatyId, partyId)            │                          │    │
└──────────────────────────────────────┘                          │    │
        △  N                                                      │    │
        │                                                         │    │
        │ 1                                                       │    │
┌────────────────────────────────────┐                            │    │
│ Party                              │                            │    │
├────────────────────────────────────┤                            │    │
│ id     String  PK                  ◄────────────────────────────┘    │
│ code   String  UNIQUE              │                                 │
│ name   String                      │                                 │
│ type   String  IDX                 │                                 │
└────────────────────────────────────┘                                 │
                                                                       │
                                                                       │
        (Topic ←→ Treaty via _TreatyTopics) ───────────────────────────┘
```

### 1.2 Models

#### `Treaty`

The instrument itself. Source: `prisma/schema.prisma`.

| Field                | Type        | Constraints            | Notes                                                                                                                       |
| -------------------- | ----------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | `String`    | `@id @default(cuid())` | Primary key                                                                                                                 |
| `slug`               | `String`    | `@unique`              | URL-stable identifier, e.g. `treaty-6-1876`                                                                                 |
| `name`               | `String`    | not null               | Full instrument name                                                                                                        |
| `shortName`          | `String?`   | nullable               | "Treaty 6", "NPT", etc.                                                                                                     |
| `openedAt`           | `DateTime`  | not null, indexed      | Date opened for signature                                                                                                   |
| `enteredIntoForceAt` | `DateTime?` | indexed                | May be null if never entered force                                                                                          |
| `depository`         | `String?`   | nullable               | Who holds the official text (UN, ICRC, Crown, …)                                                                            |
| `summary`            | `String?`   | nullable               | 1-2 sentence summary                                                                                                        |
| `fullText`           | `String`    | not null               | Full narrative text — sometimes a paraphrase, sometimes the canonical text. Audit before treating as legally authoritative. |
| `sourceUrl`          | `String?`   | nullable               | External canonical link                                                                                                     |
| `createdAt`          | `DateTime`  | `@default(now())`      |                                                                                                                             |
| `updatedAt`          | `DateTime`  | `@updatedAt`           |                                                                                                                             |

**Indices:**

- `@@index([openedAt])` — for chronological queries (treaty-timeline chart).
- `@@index([enteredIntoForceAt])` — for "active treaties" queries.

**Relations:**

- `topics: Topic[]` via `@relation("TreatyTopics")` (many-to-many, implicit join).
- `signatures: Signature[]` (one-to-many, owns).

#### `Party`

A signing entity — country (ISO 3166-1 alpha-2) or organization.

| Field  | Type     | Constraints            | Notes                                 |
| ------ | -------- | ---------------------- | ------------------------------------- |
| `id`   | `String` | `@id @default(cuid())` |                                       |
| `code` | `String` | `@unique`              | `"CA"`, `"UN-GA"`, `"PLAINS-CREE"`, … |
| `name` | `String` | not null               | Display name                          |
| `type` | `String` | indexed                | `"country"` \| `"organization"`       |

**Indices:** `@@index([type])` — filter countries vs organizations.

**Relations:** `signatures: Signature[]` (one-to-many).

#### `Signature`

A specific party's signature on a specific treaty. Join table with attributes.

| Field         | Type        | Constraints                           | Notes                                    |
| ------------- | ----------- | ------------------------------------- | ---------------------------------------- |
| `id`          | `String`    | `@id @default(cuid())`                |                                          |
| `treatyId`    | `String`    | FK → `Treaty.id`, `ON DELETE CASCADE` |                                          |
| `partyId`     | `String`    | FK → `Party.id`, `ON DELETE CASCADE`  |                                          |
| `signedAt`    | `DateTime?` | indexed                               | Date of signature                        |
| `ratifiedAt`  | `DateTime?` | nullable                              | Date of ratification (may be much later) |
| `reservation` | `String?`   | nullable                              | Free-text reservation/declaration        |
| `createdAt`   | `DateTime`  | `@default(now())`                     |                                          |

**Indices:**

- `@@index([treatyId])` — "all signatures for treaty X"
- `@@index([partyId])` — "all treaties signed by party Y"
- `@@index([signedAt])` — chronological signing queries

**Uniqueness:** `@@unique([treatyId, partyId])` — one signature row per
(treaty, party). Re-ratification updates the row; it does not insert a new one.

#### `Topic`

Hierarchical topical tag, e.g. "Indigenous rights" → "Numbered Treaty" → …

| Field      | Type      | Constraints                           | Notes                                         |
| ---------- | --------- | ------------------------------------- | --------------------------------------------- |
| `id`       | `String`  | `@id @default(cuid())`                |                                               |
| `slug`     | `String`  | `@unique`                             | `"indigenous-rights"`, `"numbered-treaty"`, … |
| `name`     | `String`  | not null                              | Display name                                  |
| `parentId` | `String?` | FK → `Topic.id`, `ON DELETE SET NULL` | Self-reference for hierarchy                  |

**Relations:**

- `parent: Topic?` (many-to-one to itself).
- `children: Topic[]` (one-to-many to itself).
- `treaties: Treaty[]` via `@relation("TreatyTopics")`.

Currently 9 topics are seeded; only one level deep (no parent set).

#### `_TreatyTopics` (implicit Prisma join)

| Column | Type     | Constraints                           | Notes |
| ------ | -------- | ------------------------------------- | ----- |
| `A`    | `String` | FK → `Topic.id`, `ON DELETE CASCADE`  |       |
| `B`    | `String` | FK → `Treaty.id`, `ON DELETE CASCADE` |       |

**Indices:** `UNIQUE(A, B)`, `INDEX(B)`.

### 1.3 Migrations

Single migration so far:

```
prisma/migrations/
└── 20260526002634_init/
    └── migration.sql      (90 lines — full DDL for the 4 models + join)
```

The `migration.sql` content matches Prisma's standard CREATE TABLE + CREATE
INDEX output for the schema above. To advance:

```powershell
# Modify prisma/schema.prisma, then:
npx prisma migrate dev --name <description>
# Generates new migration directory + applies to dev.db + regenerates client
```

### 1.4 Generated client

Prisma 7 uses the new `prisma-client` generator, which emits TypeScript
sources rather than a precompiled binary. Output is at `src/generated/prisma/`
(not the legacy `node_modules/.prisma/client` location).

Generated files of note:

- `client.ts` — `PrismaClient` class export.
- `models.ts`, `models/{Treaty,Party,Signature,Topic}.ts` — typed delegates.
- `enums.ts`, `commonInputTypes.ts` — shared types.
- `internal/{class,prismaNamespace,prismaNamespaceBrowser}.ts` — runtime guts.
- `browser.ts` — browser-safe re-exports (no DB calls).

Consumers import as:

```ts
import { PrismaClient } from "@/generated/prisma/client";
```

### 1.5 Adapter requirement (Prisma 7 + SQLite)

Prisma 7 requires a driver adapter for every DB. SQLite uses
`@prisma/adapter-better-sqlite3`:

```ts
// src/lib/db.ts
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter });
```

The adapter takes a filesystem path (the `file:` prefix from `DATABASE_URL`
must be stripped). The seed script (`prisma/seed.ts`) follows the same
pattern.

### 1.6 Seeded data

Source: `prisma/seed.ts` (run via `npx prisma db seed` or
`npx tsx prisma/seed.ts`).

Seeded contents:

- **9 topics**: `indigenous-rights`, `numbered-treaty`, `self-determination`,
  `land-and-resources`, `humanitarian-law`, `environment-climate`,
  `international-organisations`, `law-of-treaties`, `labour-rights`.
- **15 parties** (organizations + countries): Crown in Right of Canada,
  Canada, the Numbered Treaty signatory nations (Plains Cree, Woods Cree,
  Blackfoot Confederacy, Stoney Nakoda, Tsuut'ina, Beaver/Dane-zaa,
  Chipewyan/Denesųłiné, Dene Nations, Anishinaabe-Swampy Cree,
  Cree-Saulteaux), UN General Assembly, UN Member States, ILO.
- **~25–30 treaties**: All 11 Numbered Treaties (1871–1921), plus key
  international instruments (UN Charter, UDHR, Geneva Conventions, NPT,
  CRC, UNDRIP, Paris Agreement, etc.) — see `prisma/seed.ts` for the full
  list with signatories.

To verify counts:

```powershell
sqlite3 .\dev.db ".tables"
sqlite3 .\dev.db "SELECT COUNT(*) FROM Treaty;"
sqlite3 .\dev.db "SELECT COUNT(*) FROM Party;"
sqlite3 .\dev.db "SELECT COUNT(*) FROM Signature;"
sqlite3 .\dev.db "SELECT COUNT(*) FROM Topic;"
sqlite3 .\dev.db "SELECT COUNT(*) FROM _TreatyTopics;"
```

### 1.7 Connection management

`src/lib/db.ts` exports a singleton:

```ts
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

This prevents Next.js's hot-reload from instantiating dozens of clients
during dev. In production the `globalThis` hop is skipped.

Logging is `["warn", "error"]` in dev, `["error"]` in production.

---

## 2. JSON content store (typed, file-backed)

### 2.1 Layout

```
src/content/
├── evidence.json      48 EvidenceItem        71 KB
├── projects.json       4 ProjectAssessment   32 KB
├── indicators.json    37 Indicator           29 KB
├── explainers.json     7 PlainLanguageExpl.  11 KB
└── modules.json        4 ModuleConfig         4 KB
```

Each file is a single JSON object with a top-level array key:

```json
// evidence.json
{ "items": [ { …EvidenceItem }, … ] }

// projects.json
{ "projects": [ { …ProjectAssessment }, … ] }

// indicators.json
{ "indicators": [ { …Indicator }, … ] }

// explainers.json
{ "explainers": [ { …PlainLanguageExplainer }, … ] }

// modules.json
{ "modules": [ { …ModuleConfig }, … ] }
```

### 2.2 Type definitions

Source: `src/lib/content/types.ts`. Reproduced here so this doc stays
self-contained.

#### Enums

```ts
type Severity = "low" | "moderate" | "elevated" | "high" | "critical";
type Trend = "improving" | "stable" | "deteriorating" | "unknown";
type EvidenceStrength = "weak" | "moderate" | "strong" | "established";
type SourceType =
  | "court_decision"
  | "legislation"
  | "treaty_text"
  | "regulatory_filing"
  | "government_report"
  | "academic"
  | "news"
  | "ngo_report"
  | "corporate_disclosure"
  | "financial_prospectus";
type ProjectStatus =
  | "proposed"
  | "in_review"
  | "approved"
  | "under_construction"
  | "operational"
  | "paused"
  | "litigated"
  | "cancelled";
type Domain = "treaty" | "water" | "energy" | "finance" | "governance";
```

#### Shared shapes

```ts
interface SourceReference {
  evidenceSlug: string; // FK into evidence.json
  citing: string; // What this source is cited for, in this context
}

interface Claim {
  text: string;
  kind: "fact" | "risk" | "question" | "assumption" | "needs_validation";
  sources?: SourceReference[];
}

interface PartyReference {
  name: string;
  role: string; // proponent | consenting_first_nation |
  // contesting_first_nation | regulator | financier |
  // government | affected_community
  statementUrl?: string;
}
```

#### `EvidenceItem` (the evidence corpus)

```ts
interface EvidenceItem {
  slug: string; // PK within evidence.json
  title: string;
  sourceType: SourceType;
  author?: string; // Citation-style author or issuing body
  publishedAt?: string; // ISO date or YYYY
  url?: string;
  citation?: string; // Bluebook-style cite (no URL fallback)
  reliability: EvidenceStrength;
  tags: string[]; // ['law','finance','water',…]
  supports: string[]; // What this source ACTUALLY proves
  limitations?: string[]; // What it does NOT prove
  plainSummary: string; // 1-2 sentence non-specialist summary
}
```

The `supports[]` / `limitations[]` pair is the "epistemic honesty" backbone —
authors must explicitly say what a source does and doesn't establish.

#### `Indicator` (intelligence metric)

```ts
interface Indicator {
  slug: string; // PK within indicators.json
  domain: Domain;
  name: string;
  summary: string;
  value: string; // Display string ("3.50%", "Elevated", …)
  numericValue?: number; // For sparkline/sort
  unit?: string;
  severity: Severity; // For color coding
  trend: Trend; // For arrow indicator
  note?: string;
  sources?: SourceReference[];
  updatedAt: string; // ISO date
}
```

#### `ProjectAssessment` (the analytical heart of the platform)

```ts
interface ProjectAssessment {
  slug: string; // PK within projects.json
  name: string;
  shortName?: string;
  status: ProjectStatus;
  summary: string;
  location: string;
  jurisdictions: string[]; // ["British Columbia", "Federal Canada"]
  proponent: string;
  governmentObjective: string;
  proponentObjective: string;
  parties: PartyReference[];
  firstNationImplications: Claim[];
  treatyAndWaterRisk: Claim[];
  financeRisk: Claim[];
  governanceQuestions: string[];
  recommendedCommunityQuestions: string[];
  finance: ProjectFinance;
  primarySources: SourceReference[]; // FK[] into evidence.json
  evidenceConfidence: EvidenceStrength;
  domains: Domain[]; // Multi-valued
  lastReviewed: string; // ISO date
}

interface ProjectFinance {
  structure: string; // "Federal Crown corp", "CIB loan", …
  totalCostEstimate?: string;
  costOverrunsNoted?: string;
  loanGuarantor?: string;
  riskCarrier: string; // Plain-language risk landing
  sources?: SourceReference[];
}
```

#### `PlainLanguageExplainer` (FAQ)

```ts
interface PlainLanguageExplainer {
  slug: string;
  question: string;
  shortAnswer: string;
  body: string; // Markdown
  relatedEvidence?: string[]; // FK[] into evidence.json
  relatedProjects?: string[]; // FK[] into projects.json
}
```

#### `ModuleConfig` (domain landing page header)

```ts
interface ModuleConfig {
  slug: Domain; // PK within modules.json
  title: string;
  tagline: string;
  lede: string;
  featuredIndicatorSlugs: string[]; // FK[] into indicators.json
  featuredProjectSlugs: string[]; // FK[] into projects.json
}
```

### 2.3 Foreign-key map (slug-based, file-spanning)

```
evidence.json  EvidenceItem.slug  ──┐
                                    │
                  ┌─────────────────┴────────────────────────────────┐
                  │                                                  │
                  ▼ referenced by                                    │
                                                                     │
projects.json  ProjectAssessment                                     │
  ├─ primarySources[].evidenceSlug ─────────────────────────────────┤
  ├─ firstNationImplications[].sources[].evidenceSlug ──────────────┤
  ├─ treatyAndWaterRisk[].sources[].evidenceSlug ───────────────────┤
  ├─ financeRisk[].sources[].evidenceSlug ──────────────────────────┤
  └─ finance.sources[].evidenceSlug ────────────────────────────────┤
                                                                     │
indicators.json  Indicator                                           │
  └─ sources[].evidenceSlug ──────────────────────────────────────────┘

projects.json  ProjectAssessment.slug ──┐
                                        │
                                        ▼ referenced by
explainers.json  PlainLanguageExplainer.relatedProjects[]
modules.json     ModuleConfig.featuredProjectSlugs[]

indicators.json  Indicator.slug ──┐
                                  │
                                  ▼ referenced by
modules.json     ModuleConfig.featuredIndicatorSlugs[]

evidence.json    EvidenceItem.slug ──┐
                                     │
                                     ▼ referenced by
explainers.json  PlainLanguageExplainer.relatedEvidence[]
```

### 2.4 Validation contract

`src/lib/content/validators.ts` enforces:

| Check                                                                | Failure mode                                 |
| -------------------------------------------------------------------- | -------------------------------------------- |
| Slug uniqueness within each collection                               | `duplicate_slug` error                       |
| Every `evidenceSlug` resolves to an `EvidenceItem`                   | `missing_reference` error with location path |
| Every featured indicator/project slug on a module resolves           | `missing_reference`                          |
| Every `relatedEvidence` / `relatedProjects` on an explainer resolves | `missing_reference`                          |

Errors are typed as:

```ts
interface ValidationError {
  location: string; // e.g. "projects[cedar-lng].financeRisk[2].sources[0]"
  badValue: string; // the offending slug
  expectedCollection: "evidence" | "indicator" | "project" | "explainer" | "module";
  kind: "missing_reference" | "duplicate_slug" | "missing_required_field";
}
```

Run via:

```bash
npm run check:content      # standalone
npm run check              # check:content && tsc --noEmit
```

The CI gate in `scripts/check-content.mjs` exits 1 on any error.

### 2.5 Loading and aggregation

```
src/content/*.json
       │
       ▼  (ES module imports)
src/lib/content.ts
       │
       ├── 12 simple getters: getProjects(), getProject(slug),
       │    getProjectsByDomain(d), getEvidence(), getEvidenceItem(slug),
       │    getEvidenceByTag(tag), getIndicators(), getIndicator(slug),
       │    getIndicatorsByDomain(d), getExplainers(), getExplainer(slug),
       │    getModule(slug), getModules(), resolveIndicators(slugs[]),
       │    resolveProjects(slugs[])
       │
       └── re-exports from src/lib/content/aggregations.ts:
              groupBy, countBy, countByMultiValued, distinct, distinctMultiValued
              distinctTags, countByTag
              countBySourceType, countByReliability, evidenceByReliability
              countIndicatorsByDomain, countBySeverity, countByTrend
              averageSeverityByDomain
              countProjectsByDomain, projectsAcrossDomains
              claimsByKind, countClaimsByKind, allClaimsForProject,
                countClaimsByKindAcrossProjects
              projectCitationsBySourceType        ← chart on /projects
              evidenceMap (Map<slug, EvidenceItem>)
              topCitedEvidence                    ← chart on /evidence
              evidenceCountsBySourceTypeAndReliability ← heatmap on /sources
              sankeyEvidenceToProject             ← Sankey on /evidence
```

All aggregation helpers are **pure functions** — no I/O, no caching, no
side effects. They take already-loaded arrays and return typed Maps or
record arrays. Re-running them is cheap; results are not memoized.

### 2.6 Editing workflow

1. Edit the relevant JSON file under `src/content/`.
2. Run `npm run check` to verify slug references + TS types still hold.
3. Restart the dev server if Turbopack doesn't invalidate (it usually does).
4. View the affected route. If the data doesn't appear, check that:
   - Slug is unique (validator catches).
   - Required fields are present (TypeScript catches via `unknown as T` cast
     in `src/lib/content.ts`).
   - For new evidence: add it to `evidence.json` BEFORE referencing its slug
     from a project / indicator / explainer.

There is **no migration story** — when the schema in `types.ts` adds a
required field, every record in the affected JSON file must be hand-updated.

---

## 3. Combined query patterns

Examples of how the two stores work together in practice (though they don't
share FKs).

### 3.1 "What does the Yahey decision mean for new Alberta water-licence applications on Treaty 8 territory?"

```
LLM context-pack assembly (in /api/ask):
  1. Look up project: getProject("cedar-lng") — not directly relevant
  2. Look up domain: getModule("water") → featured projects + indicators
  3. Look up evidence: getEvidenceItem("yahey-2021-bcsc-1287")
     getEvidenceItem("nrta-1930-statutes-act")
  4. (Treaty 8 itself lives in the Prisma DB, not in the JSON store —
     currently NOT auto-injected into LLM context. Manual cross-ref needed.)
```

This is the cross-store gap. See ARCHITECTURE.md §11 → "Two stores, no
transactional integrity between them."

### 3.2 Top-cited evidence chart on /evidence

```
1. const projects   = getProjects();            // 4 records
2. const indicators = getIndicators();          // 37 records
3. const explainers = getExplainers();          // 7 records
4. const evidence   = getEvidence();            // 48 records
5. const map = evidenceMap(evidence);           // O(n) build Map<slug, item>
6. const top = topCitedEvidence(projects, indicators, explainers, map, 15);
     // Walks every citation surface, increments per-slug counter,
     // drops dangling refs, sorts desc, slices top 15.
7. <TopCitedEvidenceChart data={top}/>          // Recharts horizontal bar
```

### 3.3 Treaty timeline chart on /dashboard

```
1. const treaties = await prisma.treaty.findMany({
     where: { openedAt: { not: null }},
     orderBy: { openedAt: "asc" }
   });
2. const series = treaties.map(t => ({
     year: t.openedAt.getFullYear(),
     name: t.shortName ?? t.name,
   }));
3. <TreatyTimelineChart data={series}/>         // Recharts scatter/line
```

---

## 4. Schema versioning + future migrations

### Relational

Prisma's `migrate dev` is the source of truth. Each schema change yields a
new migration directory. To inspect the current state vs. schema:

```powershell
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
npx prisma migrate status
```

### JSON

No migration tooling exists. If `EvidenceItem` adds a required field,
options are:

1. Hand-edit all 48 evidence records.
2. Write a one-shot Node script that reads `evidence.json`, mutates each item,
   writes it back.
3. Make the field optional, fill over time.

Recommendation for production: move evidence/projects/indicators into
Postgres tables with Prisma migrations governing both stores (see
ARCHITECTURE.md §12 → "Promote evidence/projects/indicators to Postgres").

---

## 5. Quick reference

### Connection strings

```
# .env
DATABASE_URL="file:./dev.db"
DATABRICKS_HOST="https://dbc-2bbf7706-fc3d.cloud.databricks.com"
DATABRICKS_AI_GATEWAY_HOST="https://7474657386881097.ai-gateway.cloud.databricks.com"
# DATABRICKS_TOKEN= (optional production PAT fallback)
```

### Prisma commands

```powershell
npx prisma migrate dev --name <description>    # create + apply migration
npx prisma migrate deploy                      # apply pending in prod
npx prisma migrate reset                       # ⚠ drops + reseeds dev.db
npx prisma generate                            # regenerate src/generated/prisma/
npx prisma db seed                             # run prisma/seed.ts
npx prisma studio                              # browser inspector at :5555
```

### Content commands

```powershell
npm run check:content                          # validator only
npm run check                                  # validator + tsc --noEmit
```

### Useful queries (PowerShell + sqlite3)

```powershell
# Row counts
sqlite3 .\dev.db "SELECT 'Treaty', COUNT(*) FROM Treaty UNION ALL `
  SELECT 'Party', COUNT(*) FROM Party UNION ALL `
  SELECT 'Signature', COUNT(*) FROM Signature UNION ALL `
  SELECT 'Topic', COUNT(*) FROM Topic;"

# All Numbered Treaties with signatory counts
sqlite3 .\dev.db "SELECT t.slug, t.name, COUNT(s.id) AS sigs `
  FROM Treaty t LEFT JOIN Signature s ON s.treatyId = t.id `
  WHERE t.slug LIKE 'treaty-%' GROUP BY t.id ORDER BY t.openedAt;"

# Parties that have signed the most treaties
sqlite3 .\dev.db "SELECT p.code, p.name, COUNT(s.id) AS sigs `
  FROM Party p LEFT JOIN Signature s ON s.partyId = p.id `
  GROUP BY p.id ORDER BY sigs DESC LIMIT 10;"
```

---

_Last updated: 2026-05-27._
