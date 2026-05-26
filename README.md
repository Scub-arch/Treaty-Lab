# Treaty-Lab

**Pilot v0.1 — Indigenous-led infrastructure intelligence terminal.**

Treaty-Lab turns messy legal, financial, technical, government, and community information into clear intelligence for decision-making — for First Nation communities, infrastructure investors, legal and policy researchers, and government-relations teams.

The pilot demonstrates that the platform can:

- Trace every claim to public-record evidence
- Separate confirmed facts from risks, open questions, stated assumptions, and items needing community or legal validation
- Surface project certainty signals across treaty rights, water availability, grid realism, and financing structure
- Translate finance and governance concepts into plain language

## What's in this pilot

Nine sections accessible via the sidebar terminal navigation:

| Module                  | Path           | Purpose                                                                                      |
| ----------------------- | -------------- | -------------------------------------------------------------------------------------------- |
| Command Center          | `/`            | Hero thesis, current risk indicators, infrastructure watchlist, module index                 |
| Treaty Terminal         | `/treaty`      | Treaty rights, consultation status, governance risk, community validation                    |
| Water Intelligence      | `/water`       | Watershed stress, drought, industrial demand, First Nation water rights                      |
| Energy & Grid           | `/energy`      | Transmission constraints, AI/data-centre load growth, asset-stranding exposure               |
| Indigenous Finance      | `/finance`     | Ownership structures, CIB/AIOC/FNFA financing, debt exposure, cash-flow waterfalls           |
| Project Assessments     | `/projects`    | Detailed assessments of 4 real Canadian projects, with claims separated by kind              |
| Evidence Library        | `/evidence`    | 12 public-record sources (treaty texts, SCC decisions, legislation, program documentation)   |
| Plain-Language          | `/explainers`  | 7 explainers for community-decision-relevant concepts                                        |
| Treaty Archive          | `/archive`     | Searchable archive of 12 historical treaties — Numbered Treaties 1, 4, 6, 7, 8, 11 + international instruments (UNDRIP, ILO 169, UN Charter, VCLT, Geneva IV, Paris Agreement) |

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
