# DATA-001 Implementation Plan — Content collections → Prisma (dual-schema)

> Status: **PLAN approved (2026-05-30) — PR-1 (schema + seed) implementation in progress on `data-001-schema-seed`.**
> Ticket: `docs/LINEAR_BACKLOG.md:89`. Priority P0 (blocks DATA-002, DATA-003, RPT-001, UI-002).
> Decisions locked with requester: **dual schema** (SQLite for local/CI, Postgres for prod) · **plan before code** · **1:1 `ProjectFinance` model** (Q-A) · **generator script for Postgres schema** (Q-B) · **two PRs** (Q-C: PR-1 schema+seed, PR-2 `content.ts` swap).

## Context

The five content collections (`evidence`, `projects`, `indicators`, `explainers`, `modules`) currently live as
JSON in `src/content/*.json` and are imported synchronously by `src/lib/content.ts`. Cross-references between them
are **slug strings** validated at read-time by `src/lib/content/validators.ts` (run in CI via
`scripts/check-content.mjs`). DATA-001 promotes these to first-class Prisma models with real foreign keys, moves
validation to write (seed) time, and keeps every page rendering identically. This unblocks cross-store treaty FKs
(DATA-002), audit/versioning (DATA-003), live report rendering (RPT-001), and persisted transcripts (UI-002).

## Guiding constraints (the two that shape everything)

1. **Preserve the synchronous getter API.** All 20 getters in `src/lib/content.ts` (`getProjects()`,
   `getEvidenceItem(slug)`, `resolveIndicators(slugs)`, …) are called synchronously by **31 consumers**, including
   `generateStaticParams()` / `generateMetadata()` and non-async helpers in `src/lib/dashboard-data.ts`. Making them
   `async` would ripple into all 31. **We will not.** Instead `content.ts` loads all five collections from Prisma
   **once** into module-level arrays (a top-level `await` bootstrap) and the getters read those arrays synchronously —
   exactly the "thin in-memory cache populated at server start" the ticket allows. Blast radius: **`content.ts` only.**

2. **Dual-target schema must compile on both SQLite and Postgres.** Prisma scalar-list arrays (`String[]`) are
   **not** supported on SQLite. So value arrays become `Json` columns (supported on both); cross-reference arrays
   become **relations**. Prisma enums are avoided — we keep `String` columns (the TS string-literal unions in
   `src/lib/content/types.ts` remain the source of truth, enforced by the seed-time validator).

## 1. Schema design — new models in `prisma/schema.prisma`

Conventions match the existing `Treaty`/`Party`/`Signature`/`Topic` models: `id String @id @default(cuid())`,
`slug String @unique`, `createdAt`/`updatedAt`. New models:

- **`EvidenceItem`** — `slug`, `title`, `sourceType` (String), `author?`, `publishedAt?`, `url?`, `citation?`,
  `reliability` (String), `plainSummary`, plus `tags Json`, `supports Json`, `limitations Json` (value arrays).
  Back-relations: `claimSources ClaimSource[]`, `indicatorSources IndicatorSource[]`,
  `explainerEvidence ExplainerEvidence[]`.
- **`Indicator`** — `slug`, `domain` (String), `name`, `summary`, `value`, `numericValue? Float`, `unit?`,
  `severity` (String), `trend` (String), `note?`, `updatedAt`. Relation: `sources IndicatorSource[]`,
  `featuredInModules ModuleFeaturedIndicator[]`.
- **`PlainLanguageExplainer`** — `slug`, `question`, `shortAnswer`, `body`. Relations:
  `relatedEvidence ExplainerEvidence[]`, `relatedProjects ExplainerProject[]`.
- **`ModuleConfig`** — `slug` (= Domain), `title`, `tagline`, `lede`. Relations:
  `featuredIndicators ModuleFeaturedIndicator[]`, `featuredProjects ModuleFeaturedProject[]`.
- **`ProjectAssessment`** — scalar fields (`slug`, `name`, `shortName?`, `status`, `summary`, `location`,
  `proponent`, `governmentObjective`, `proponentObjective`, `evidenceConfidence`, `lastReviewed`) + `Json`
  value-arrays (`jurisdictions`, `domains`). Finance is inlined as nullable columns (`financeStructure`,
  `financeRiskCarrier`, `financeTotalCostEstimate?`, …) **or** a 1:1 `ProjectFinance` model — see Open Question A.
  Child relations: `parties PartyReference[]`, `claims Claim[]`, `primarySources ProjectSource[]`.

**Cross-reference → FK relations (replacing slug strings, all `onDelete: Restrict`):**

- **`Claim`** — child of `ProjectAssessment` (`projectId`), with `text`, `kind` (String), and a discriminator
  `group` (String: `firstNationImplications` | `treatyAndWaterRisk` | `financeRisk`) so the three claim arrays
  round-trip. `sources ClaimSource[]`.
- **`ClaimSource`** — join: `claimId` → `Claim`, `evidenceId` → `EvidenceItem` (`@relation(onDelete: Restrict)`),
  plus the free-text `citing` field.
- **`IndicatorSource`** — join: `indicatorId` → `Indicator`, `evidenceId` → `EvidenceItem`, `citing`.
- **`ProjectSource`** — `primarySources[]`: `projectId` → `ProjectAssessment`, `evidenceId` → `EvidenceItem`, `citing`.
- **`PartyReference`** — child of project: `projectId`, `name`, `role`, `statementUrl?` (names stay free-text — they
  are **not** the treaty-registry `Party`; that linkage is DATA-002, explicitly out of scope here).
- **`ExplainerEvidence`** / **`ExplainerProject`** — joins for `relatedEvidence[]` / `relatedProjects[]`.
- **`ModuleFeaturedIndicator`** / **`ModuleFeaturedProject`** — ordered joins for `featuredIndicatorSlugs[]` /
  `featuredProjectSlugs[]` (add an `order Int` so featured ordering is preserved).

`nrta-authorizations.json` is **out of scope** (it is an external-registry metadata catalog with no cross-refs and
its own validator `scripts/check-nrta.mjs`; leave as JSON).

## 2. Dual-schema strategy (SQLite default, Postgres for prod)

- `prisma/schema.prisma` **stays `provider = "sqlite"`** — local dev and CI keep working unchanged, the gate stays
  green, `prisma/dev.db` + existing migrations remain valid.
- Add `prisma/schema.postgres.prisma` — identical `model` blocks, `provider = "postgresql"`. To prevent drift, the
  models are written once and the Postgres file is generated by a tiny script
  `scripts/gen-postgres-schema.mjs` (copies `schema.prisma`, swaps the `datasource` provider line, output dir).
  Prod migrations live under `prisma/migrations-postgres/`. (Open Question B: accept the generator script vs. hand-maintain.)
- Because we deliberately avoid Prisma enums and `String[]` scalar lists, the **same model definitions compile on
  both** targets — that is the whole reason for the `Json` + relation modeling above.

## 3. Seed rewrite — extend `prisma/seed.ts`

Keep the existing Treaty/Party/Topic seeding. Add a content phase that **reads `src/content/*.json`** (not hard-coded)
and inserts in dependency order inside **one `prisma.$transaction([...])`**, failing loud on any cross-ref miss:

1. Insert `EvidenceItem` rows first (no outbound FKs); build `Map<slug, id>`.
2. Insert `Indicator`, `ProjectAssessment` (+ `Claim`, `PartyReference`), `PlainLanguageExplainer`, `ModuleConfig`.
3. Insert all join rows (`ClaimSource`, `IndicatorSource`, `ProjectSource`, `ExplainerEvidence`/`Project`,
   `ModuleFeatured*`) resolving slug→id from the maps; **throw** (abort the transaction) if any slug is unknown —
   reuse the logic from `validateContent()` (§4) as the pre-insert gate.

Mirror the existing seed's slug→id map pattern (`seed.ts:295-367`) and `better-sqlite3` adapter setup.

## 4. Validation moves to write-time — `src/lib/content/validators.ts`

`validateContent()` already encodes every cross-reference rule (`validators.ts:48-166`). Repurpose it as a **pure,
data-in** validator: `validateContent(collections) → ValidationResult`, called **by the seed** before inserts (and
later by an admin UI). `assertSlugsPresent()` (`validators.ts:173`) becomes the throw-on-miss gate inside the seed
transaction. `scripts/check-content.mjs` keeps running it against the JSON in CI (the JSON stays the source of
truth for seeding), so the existing `npm run check:content` gate is unchanged.

## 5. Swap `src/lib/content.ts` to read from Prisma (the only consumer-facing change)

Replace the JSON imports (`content.ts:1-19`) with a one-time async bootstrap that hydrates module-level arrays from
Prisma, then keep **all 20 getters + re-exports byte-for-byte identical** in signature:

```ts
// pseudo —
const [projects, evidence, indicators, explainers, modules] = await loadAllFromPrisma();
export function getProjects() {
  return projects;
} // unchanged signature
export function getEvidenceItem(slug: string) {
  return evidenceBySlug.get(slug);
}
// …aggregations/validators re-exports unchanged…
```

Top-level `await` evaluates once per server/build process; sync getters then serve from memory. Reshape Prisma rows
back into the exact `src/lib/content/types.ts` shapes (e.g. re-nest `Claim.sources`, collapse joins to
`SourceReference[]`, parse `Json` arrays) so `aggregations.ts` and every page see identical objects. **No consumer
file changes.**

## 6. Tooling

- Add `prisma/seed` content phase (above). Add **`"db:reset": "prisma migrate reset --force && prisma db seed"`** to
  `package.json` (drops + migrates + seeds). Per CONTRIBUTING, commit scope `data-001`.
- `ci.yml` already runs `prisma migrate deploy` + `prisma db seed` before `next typegen`/`check`/`build`, so the
  content models get created and seeded in CI automatically once migrations exist — **no workflow change expected**.
- README: document that `src/content/*.json` are the **seed corpus / source of truth for seeding**, not runtime reads.

## Files to change (representative)

- `prisma/schema.prisma` — add the ~13 models/joins above (new SQLite migration via `prisma migrate dev`).
- `prisma/schema.postgres.prisma` + `scripts/gen-postgres-schema.mjs` — Postgres target (generated).
- `prisma/seed.ts` — read-from-JSON content phase in one transaction.
- `src/lib/content.ts` — Prisma-backed bootstrap; getters unchanged.
- `src/lib/content/validators.ts` — `validateContent(collections)` becomes data-in / write-time.
- `package.json` — `db:reset` script. `README.md` — seed-corpus note.
- **Unchanged:** all 31 consumers, `aggregations.ts`, `types.ts`, `scripts/check-content.mjs`, `scripts/check-nrta.mjs`.

## Verification (end-to-end)

1. `npm run db:reset` — migrations apply, seed inserts all five collections; seed prints per-collection counts
   matching today's (`4 projects, 48 evidence, 37 indicators, 7 explainers, 4 modules`). A deliberately broken
   cross-ref in a JSON file must **abort the seed transaction** (proves write-time validation).
2. `npm run check` — `check:content` + `check:nrta` + `tsc --noEmit` all green (types preserved).
3. `npm run build` — full build; spot-check that `/projects`, `/evidence`, `/sources`, `/`, `/explainers`,
   and the `[slug]` routes prerender the **same page count and content** as `main` today (diff the route table).
4. `npx tsx scripts/gen-postgres-schema.mjs && npx prisma validate --schema prisma/schema.postgres.prisma` — the
   Postgres schema validates.
5. Manual: load `/projects/cedar-lng` and confirm claims, parties, citations, and finance render identically.

## Resolved decisions (signed off)

- **A. Finance modeling → 1:1 `ProjectFinance` model.** Separate table linked 1:1 to `ProjectAssessment`;
  `finance.sources[]` becomes a normal `ProjectFinanceSource` join to `EvidenceItem`.
- **B. Postgres dual-target → generator script.** `scripts/gen-postgres-schema.mjs` derives
  `prisma/schema.postgres.prisma` from the canonical `prisma/schema.prisma`. Single source of truth, no drift.
- **C. Delivery → split into two PRs.**
  - **PR-1 `data-001-schema-seed`:** add the ~14 models + SQLite migration + seed-from-JSON (one `$transaction`,
    write-time validation) + `db:reset` + Postgres generator. Getters stay JSON-backed → fully green, no behavior change.
  - **PR-2 `data-001-content-prisma`:** flip `src/lib/content.ts` to the Prisma-backed in-memory bootstrap; getters
    unchanged. Pages verified byte-identical.
- **D. Environment stability → resolved.** Branch protection is active on `main` (require `check` status check;
  no force-pushes; no deletions). The `data-001-schema-seed` branch was created off `main@c3507b4` and confirmed
  clean before this commit. Going forward, every material step prints `git status` first; subagent stomps remain
  possible but are detectable and recoverable (rebase + safety tags + `--force-with-lease`).
