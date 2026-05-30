# Treaty-Lab

**Pilot v0.2 — a source-backed Indigenous infrastructure intelligence terminal.**

Treaty-Lab is designed to help communities, analysts, leadership, and advisors
understand project risk before decisions are made. Its core advantage is
**traceable evidence + plain-language risk analysis + project decision support**.

The product is organised around a single flow that every page reinforces:

> **Claim → Source → Risk → Plain-language explanation → Decision support**

The full product thesis, target users, evidence standards, safe-wording rules,
required project-page structure, and roadmap are documented in
[`docs/PROJECT_NORTH_STAR.md`](docs/PROJECT_NORTH_STAR.md). Read it before
making changes that affect product copy, page structure, or claim/source
handling.

## v0.2 changes

- **Content grounded in real cited sources.** Evidence Library expanded from 12 invented items to 36 cited primary documents (Constitution Acts, UNDRIP + UN Declaration Act + 2023-2028 Action Plan, Yahey 2021 BCSC 1287, Blueberry River Implementation Agreement, Tsuu T'ina v. Alberta 2008, AB Water Act, AB Surface Water Allocation Directive, AB Proponent Consultation Guide 2024, CIB Indigenous Equity Initiative + Investment Policy, AIOC Loan Guarantee Guidelines + Mandate, FNFA 2024-25 Annual Report + Morningstar DBRS 2025, FNMPC Loan Guarantee Primer, CILGC Applicant Guide v3, CER Growing Indigenous Ownership 2026, Cedar LNG FID + EA + Pembina news release, Hydro One IR Policy 2025, AB Indigenous Relations Business Plan 2026-29, AB AI Data Centre Strategy, AESO 2025 Annual Report + Phase I + Phase 2A, NERC Large Loads Task Force 2025, Capital Power Genesee 2025, AB Drought Response Plan + Water Supply Outlook + SSRB Closed Basin Directive + SSRB Allocation 2003-05, Peace & Slave Watershed 2024, OSM 2025, Palash mine-water climate 2025, Weber wetland governance 2017, FNIGC OCAP Principles + Barriers & Levers 2014, Davidson legislative slippage 2018).
- **Indicators replaced with measurable real readings.** 38 indicators, every one tied to a cited source (e.g. 85% of Blueberry Claim Area within 250m of industrial disturbance, St. Mary 118% of median natural flow, AESO 20,000+ MW data-centre queue with only 1,200 MW Phase I cap cleared, Capital Power Genesee 1,500 MW PROPOSED on Treaty 6 land, FNFA $3.9B portfolio at AA-/Aa3/AA(low), FNMPC-projected $51B 10-year Indigenous equity need, documented Coastal GasLink First Nation equity forfeiture, Hydro One 50%-equity threshold above $100M Ontario transmission projects).
- **Cedar LNG project assessment fully rebuilt** with 30+ confirmed facts from the Pembina April 2024 release, Cedar LNG fact sheets, Morningstar DBRS October 2025 credit-rating report, and CER 2026 Market Snapshot — including FID date (June 25 2024), US$3.4B Class III capex (US$4.0B fully loaded), 60/40 debt-equity split, Samsung Heavy Industries + Black & Veatch EPC, MUFG + CIBC financial advisors, $200M federal SIF + FNFA capital commitment + $200M BC electrification contribution agreement.
- **Coastal GasLink** now documents the FNMPC-recorded First Nations equity forfeiture in the 10% expansion round — the canonical case for why federal loan-guarantee architecture matters.
- **Site C** now notes the Blueberry Implementation Agreement's explicit Site C transmission carveout from the 'New Disturbance' definition.
- **TMX** now references the Athabasca Indigenous Investments / Enbridge precedent ($1.12B for 11.57% — $250M AIOC + $870M bond) as the documented analogue for a future Indigenous-led TMX acquisition.
- **New Command Center radar chart** showing the cross-domain composite severity (treaty / water / energy / finance / governance), built on recharts via the shadcn chart primitive. Sits alongside per-domain readings panel.
- **Subtle institutional glow** added behind the hero thesis.
- **Phase 8 Sources PDF corpus** (~115 PDFs across Legal, Finance, Water, Power-AI-DataCentres, Govt Policy, Community Validation, Precedents, Advisor Questions) extracted to plain text via `scripts/extract-pdfs.mjs` (uses `unpdf`, no Poppler required) and synthesised in parallel by five domain-focused subagents. Synthesis markers are kept in `.work/agent-out-*.md` for transparency on how each cited fact was sourced.

---

## The foundational lens — The Treaties Came First

Every analytical layer in Treaty-Lab — water, energy, finance, governance — operates **downstream of Treaty**. Treaty 6, 7, and 8 covenants are not constraints applied after the fact; they are the jurisdictional chassis under every infrastructure question this platform analyzes.

> "Alberta sovereignty is an illusion. Without Treaty, Alberta as we know it wouldn't exist. Our ancestors entered into Treaty in friendship — to share our territories and maintain our sacred responsibilities to our lands in peace. **The Treaties came first.**"
>
> — Confederacy of Treaty No. 6, 2026 statement opposing Bill 14 (Alberta independence enabling legislation), joined by the Blackfoot Confederacy and Treaty No. 8 Nations.

Where provincial legislation, regulatory frameworks, or project financing structures are silent on s.35 rights or fail to address Treaty obligations, **that silence is itself an analytical signal**. The platform surfaces those silences rather than reading them as neutral.

---

**Pilot v0.1 baseline — what the platform is designed to do:**

Treaty-Lab is designed to take scattered legal, financial, technical, government,
and community information about an infrastructure project and present it in a
form that supports a decision. The intended audience is First Nation communities,
analysts, leadership and advisors, legal and policy reviewers, and the
infrastructure / finance reviewers who interact with them.

The pilot is built to:

- **Trace every claim to public-record evidence**, with source type and
  reliability tier visible.
- **Separate confirmed facts** from risks, open questions, stated assumptions,
  and items needing community or legal validation.
- **Surface project-certainty signals** across treaty rights, water availability,
  grid realism, financing structure, and consultation status.
- **Translate finance, governance, and regulatory concepts into plain language**
  that supports community decision-making.
- **Organise the decision-support questions** a community, analyst, or advisor
  would ask before approving, opposing, partnering on, or financing a project.

What the platform is **not**: a generic dashboard, a news site, an activism
page, a legal-accusation tool, an unsourced AI assistant, or a replacement for
legal advice, investment advice, or community consent processes.

## What's in this pilot

The intelligence terminal is organised in three groups in the sidebar:

| Group        | Module              | Path          | Purpose                                                                                                                                                                     |
| ------------ | ------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intelligence | Command Center      | `/`           | Foundational thesis, cross-domain severity composite, current risk indicators, infrastructure watchlist, module index                                                       |
| Intelligence | Treaty Terminal     | `/treaty`     | Treaty rights, consultation status, governance risk, community validation                                                                                                   |
| Intelligence | Water Intelligence  | `/water`      | Watershed stress, drought, industrial demand, First Nation water rights                                                                                                     |
| Intelligence | Energy & Grid       | `/energy`     | Transmission constraints, AI/data-centre load growth, asset-stranding exposure                                                                                              |
| Intelligence | Indigenous Finance  | `/finance`    | Ownership structures, CIB/AIOC/FNFA financing, debt exposure, cash-flow waterfalls                                                                                          |
| Research     | Project Assessments | `/projects`   | Detailed assessments of 4 real Canadian projects, with claims separated by kind                                                                                             |
| Research     | Evidence Library    | `/evidence`   | 48 public-record sources (treaty texts, SCC decisions, legislation, regulatory filings, program documentation)                                                              |
| Research     | Cited Sources       | `/sources`    | Source-reliability heatmap and cross-reference index                                                                                                                        |
| Research     | Plain-Language      | `/explainers` | 7 explainers for community-decision-relevant concepts                                                                                                                       |
| Research     | Treaty Archive      | `/archive`    | Searchable archive of historical treaties — Numbered Treaties 1, 4, 6, 7, 8, 11 + international instruments (UNDRIP, ILO 169, UN Charter, VCLT, Geneva IV, Paris Agreement) |
| Tools        | Analyst Q&A         | `/ask`        | Source-grounded question console backed by the Databricks AI Gateway                                                                                                        |
| Tools        | Static Reports      | `/reports`    | Cross-reference visualisations (per-project citation mix, top-cited evidence, source-reliability heatmap)                                                                   |

Current content counts (kept in sync by the validator in
`src/lib/content/validators.ts`): **4 project assessments · 48 evidence items ·
37 indicators · 7 explainers · 4 domain modules**.

## Sample data — important caveats

- **Project assessments** cover Coastal GasLink, Site C, Trans Mountain Expansion, and Cedar LNG. Every claim is conservatively worded and tied to public-record evidence. Specific terms of impact-benefit agreements, equity options, and loan-guarantee structures that are not in the public record are explicitly flagged as `needs_validation`.
- **The Treaty Archive** uses the Crown / institutional written versions of the Numbered Treaties. Indigenous oral histories of treaty intent often differ materially. The platform notes this on every Numbered Treaty.
- **Indicators** are qualitative composites, not market indices. They are designed to surface considerations and risk signals, not to recommend action.
- **Source-grounded answers** in the Analyst Q&A surface are produced by an LLM against the project, evidence, and indicator content. They are intended to organise and translate the existing record, not to introduce new facts. Always check the cited evidence directly.
- **Nothing here is investment advice or legal advice.** This is a research-intelligence pilot. Community, counsel, and advisor review remain required before any operative use.

## Tech stack

- Next.js 16 (App Router, Turbopack, React 19)
- TypeScript (strict)
- Tailwind CSS v4
- shadcn/ui (base-nova preset) + lucide-react icons
- Prisma 7 with `@prisma/adapter-better-sqlite3` (SQLite for the Treaty Archive)
- Local JSON content files for intelligence modules — no backend service required

## Development

Install dependencies:

```bash
npm install
```

Generate the Prisma client and apply the SQLite migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

Seed the database — the Treaty Archive **and** the content collections
(evidence, projects, indicators, explainers, modules), read from
`src/content/*.json`:

```bash
npx prisma db seed
```

The five `src/content/*.json` files are the **source of truth for seeding** the
content tables: the seed validates every cross-reference write-time and resolves
slug references to real foreign keys (an unresolved reference aborts the whole
transaction). To drop, re-migrate, and re-seed in one step:

```bash
npm run db:reset
```

Production runs on Postgres. After any schema change, regenerate the Postgres
target from the canonical SQLite schema:

```bash
npm run db:postgres-schema   # writes prisma/schema.postgres.prisma
```

Run the dev server:

```bash
npm run dev
```

The app boots on `http://localhost:3000` (or the next available port).

## Contributing

All changes land through a pull request. A GitHub Actions **CI gate**
(`.github/workflows/ci.yml`) runs on every PR and on every push to `main`, and
branch protection on `main` requires its `gate` job to pass before a PR can be
merged.

The gate runs three checks in parallel after a shared dependency-install step:

| Job                | What it runs                                   | Why it can fail                                            |
| ------------------ | ---------------------------------------------- | --------------------------------------------------------- |
| `typecheck`        | `tsc --noEmit` (after `prisma generate` + `next typegen`) | A type error anywhere in `src/` or `prisma/`.   |
| `content-validate` | `npm run check:content` + `npm run check:nrta` | Content JSON drifts from the schema or NRTA invariants.    |
| `build`            | `next build` with `NODE_ENV=production` (after `prisma migrate deploy` + `db seed`) | The production build breaks, including static generation. |

A final `gate` job depends on all three and is the single required status
check. Reproduce the whole gate locally before pushing:

```bash
npm run check   # check:content + check:nrta + tsc --noEmit
npm run build   # production build
```

Caching keeps the gate fast: `node_modules` is cached by the `package-lock.json`
hash, and `.next/cache` is cached by the source-tree hash, so warm runs skip the
cold install and reuse the incremental build cache.

## Project layout

```
src/
├── app/                  # Next.js App Router pages — one folder per section
│   ├── page.tsx          # Command Center (home)
│   ├── treaty/           # Treaty Terminal
│   ├── water/            # Water Intelligence
│   ├── energy/           # Energy & Grid
│   ├── finance/          # Indigenous Finance
│   ├── projects/         # Project Assessments (list + [slug])
│   ├── evidence/         # Evidence Library (list + [slug])
│   ├── explainers/       # Plain-Language Explainers (list + [slug])
│   └── archive/          # Treaty Archive (Prisma-backed, list + [slug])
├── components/
│   ├── ui/               # shadcn/ui primitives
│   └── intel/            # Reusable intelligence-terminal components
│       ├── sidebar.tsx
│       ├── top-bar.tsx
│       ├── module-page.tsx
│       ├── intelligence-panel.tsx
│       ├── risk-card.tsx
│       ├── source-card.tsx
│       ├── project-assessment-card.tsx
│       ├── watchlist-table.tsx
│       ├── plain-language-box.tsx
│       ├── indicator-badge.tsx
│       └── evidence-strength-badge.tsx
├── content/              # JSON sample data (validated by scripts/check-content.mjs)
│   ├── projects.json     # 4 project assessments
│   ├── evidence.json     # 48 evidence-library items
│   ├── indicators.json   # 37 indicators across all modules
│   ├── explainers.json   # 7 plain-language explainers
│   └── modules.json      # Module landing-page configs
├── lib/
│   ├── content.ts        # Typed loaders for JSON content
│   ├── content/types.ts  # Content schema
│   ├── db.ts             # Prisma client singleton
│   └── utils.ts          # cn() and friends
├── generated/prisma/     # Prisma 7 generated client (gitignored)
└── app/globals.css       # Tailwind v4 theme

prisma/
├── schema.prisma          # SQLite (canonical): treaty registry + content models
├── schema.postgres.prisma # GENERATED prod target (scripts/gen-postgres-schema.mjs)
├── seed.ts                # 12 treaties + content collections from src/content/*.json
└── migrations/            # SQLite migrations
```

## Design intent

This is **not** a generic advocacy or nonprofit site. The intended aesthetic is institutional, analytical, and serious — Bloomberg-terminal / McKinsey-research-portal — appropriate for the kind of structured decision-making this platform supports.

- Dark, institutional theme by default
- Mono-spaced typography for codes, timestamps, and quantitative data
- Restrained colour: severity is signalled in amber, orange, red; evidence-strength in blue/indigo
- Generous whitespace, narrow line lengths in body copy, clear hierarchy
- No marketing animations or hero stock photography
