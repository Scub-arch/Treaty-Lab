# Treaty-Lab

**Pilot v0.2 — Indigenous-led infrastructure intelligence terminal.**

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

**Pilot v0.1 baseline:**

Treaty-Lab turns messy legal, financial, technical, government, and community information into clear intelligence for decision-making — for First Nation communities, infrastructure investors, legal and policy researchers, and government-relations teams.

The pilot demonstrates that the platform can:

- Trace every claim to public-record evidence
- Separate confirmed facts from risks, open questions, stated assumptions, and items needing community or legal validation
- Surface project certainty signals across treaty rights, water availability, grid realism, and financing structure
- Translate finance and governance concepts into plain language

## What's in this pilot

Nine sections accessible via the sidebar terminal navigation:

| Module              | Path          | Purpose                                                                                                                                                                        |
| ------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Command Center      | `/`           | Hero thesis, current risk indicators, infrastructure watchlist, module index                                                                                                   |
| Treaty Terminal     | `/treaty`     | Treaty rights, consultation status, governance risk, community validation                                                                                                      |
| Water Intelligence  | `/water`      | Watershed stress, drought, industrial demand, First Nation water rights                                                                                                        |
| Energy & Grid       | `/energy`     | Transmission constraints, AI/data-centre load growth, asset-stranding exposure                                                                                                 |
| Indigenous Finance  | `/finance`    | Ownership structures, CIB/AIOC/FNFA financing, debt exposure, cash-flow waterfalls                                                                                             |
| Project Assessments | `/projects`   | Detailed assessments of 4 real Canadian projects, with claims separated by kind                                                                                                |
| Evidence Library    | `/evidence`   | 12 public-record sources (treaty texts, SCC decisions, legislation, program documentation)                                                                                     |
| Plain-Language      | `/explainers` | 7 explainers for community-decision-relevant concepts                                                                                                                          |
| Treaty Archive      | `/archive`    | Searchable archive of 12 historical treaties — Numbered Treaties 1, 4, 6, 7, 8, 11 + international instruments (UNDRIP, ILO 169, UN Charter, VCLT, Geneva IV, Paris Agreement) |

## Sample data — important caveats

- **Project assessments** cover Coastal GasLink, Site C, Trans Mountain Expansion, and Cedar LNG. Every claim is conservatively worded and tied to public-record evidence. Specific terms of impact-benefit agreements, equity options, and loan-guarantee structures that are not in the public record are explicitly flagged as `needs_validation`.
- **The Treaty Archive** uses the Crown / institutional written versions of the Numbered Treaties. Indigenous oral histories of treaty intent often differ materially. The platform notes this on every Numbered Treaty.
- **Indicators** are qualitative composites, not market indices. They are designed to surface considerations, not to recommend action.
- **Nothing here is investment advice or legal advice.** This is a research-intelligence pilot.

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

Seed the Treaty Archive:

```bash
npx prisma db seed
```

Run the dev server:

```bash
npm run dev
```

The app boots on `http://localhost:3000` (or the next available port).

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
├── content/              # JSON sample data
│   ├── projects.json     # 4 project assessments
│   ├── evidence.json     # 12 evidence-library items
│   ├── indicators.json   # 18 indicators across all modules
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
├── schema.prisma         # Treaty / Party / Signature / Topic
├── seed.ts               # 12 historical treaties
└── migrations/           # SQLite migrations
```

## Design intent

This is **not** a generic advocacy or nonprofit site. The intended aesthetic is institutional, analytical, and serious — Bloomberg-terminal / McKinsey-research-portal — appropriate for the kind of structured decision-making this platform supports.

- Dark, institutional theme by default
- Mono-spaced typography for codes, timestamps, and quantitative data
- Restrained colour: severity is signalled in amber, orange, red; evidence-strength in blue/indigo
- Generous whitespace, narrow line lengths in body copy, clear hierarchy
- No marketing animations or hero stock photography
