# NRTA Phase 1 — Authorizations ingestion foundation

This document describes the Phase 1 foundation for NRTA water-use / authorization tracking. Phase 1 ships **structure, not numbers** — it creates the schema, seed file, and validator that Phase 2+ will populate. Pair this README with [`NRTA_WATER_INGESTION_PLAN.md`](./NRTA_WATER_INGESTION_PLAN.md), which is the operational plan; this README is the implementation note for the first PR against that plan.

---

## What Phase 1 does

1. Adds `src/lib/nrta/types.ts` — TypeScript types for the five entities:
   - `NrtaProject` — a project in NRTA scope (AB / SK / MB).
   - `Authorization` — a single water licence, permit, or approval.
   - `SourceRecord` — a citation of a registry or primary document.
   - `WaterUseIndicator` — a per-project aggregated water-use signal.
   - `IngestionStatus` — verification / data-quality state per project.
2. Adds `src/lib/nrta/data.ts` — read-only loaders plus a runtime `validateNrtaBundle()` helper.
3. Adds `src/content/nrta-authorizations.json` — seed bundle with **placeholder rows** for the 5 Tier-1 projects called out in plan §6:
   - Capital Power Genesee Data Centre
   - Mihta Askiy / Cree Ative Data Centre
   - Onion Lake Energy
   - Wapiti / Smoky sub-basin O&G aggregate
   - TMX — Alberta pump-station water licences
4. Adds `scripts/check-nrta.mjs` — a CI-grade validator wired into `npm run check` as `npm run check:nrta`. It enforces:
   - slug uniqueness across all five collections,
   - every project / authorization / water-use indicator cites ≥ 1 source record,
   - every authorization references a known project,
   - every water-use indicator references known authorizations and a known project,
   - placeholder rows keep `allocatedVolume_m3_per_year` as `null` until verified.

The Phase 1 PR does not change the product UI. The bundle is self-contained — it does not cross-reference `evidence.json`, `projects.json`, `indicators.json`, or any other content collection. Promotion to a fully-joined Option-A content collection (plan §5) is a Phase 2 concern.

---

## What data is placeholder

**All numeric fields in the Phase 1 bundle are `null`.** Specifically:

- Every `Authorization.allocatedVolume_m3_per_year` is `null`.
- Every `Authorization.authorizationNumber` is `null`.
- Every `Authorization.actualConsumption_m3_per_year` is absent or `null`.
- Every `WaterUseIndicator.value` is `null`.

Each placeholder row carries:

- `ingestionState: "placeholder"`,
- a `placeholderFields` list naming the fields that still need verification,
- a `reviewerNote` describing what the human reviewer should do next, and
- ≥ 1 `sourceRecordSlugs` entry pointing to the public registry where verification should happen.

Tier-1 project rows that group multiple operators (e.g. `wapiti-smoky-og-aggregate`) are aggregate placeholders. Replacing them with per-licensee rows is a Phase 2 task.

---

## What still requires manual verification

The `outstandingTasks` array on each `IngestionStatus` row is the authoritative checklist. Summary:

| Project                             | Outstanding                                                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `capital-power-genesee-data-centre` | Locate Genesee Water Act licence #(s); locate EPEA approval; confirm source water body.                                                                        |
| `mihta-askiy-cree-ative-datacentre` | Confirm whether a water-licence application is public; confirm AESO Phase I queue position.                                                                    |
| `onion-lake-energy`                 | Enumerate AB + SK provincial rows separately (Reserve straddles the border); identify any IOGC federal licences; capture produced-water disposal destinations. |
| `wapiti-smoky-og-aggregate`         | Identify top 1–2 licensees in the Wapiti/Smoky sub-basin; replace aggregate row with per-licensee rows.                                                        |
| `tmx-ab-pump-stations`              | Enumerate AB pump stations and provincial licence records; locate hydrostatic-test water volumes in CER filings.                                               |

Two rows additionally carry `dataSovereigntyNote` per plan §8.2:

- `status-mihta-askiy` — defer to Woodland Cree FN governance on community-relevant data; Phase 1 limits ingestion to public registry fields only.
- `status-onion-lake-energy` — ground IOGC ingestion in FNIGC guidance before pulling federal records.

---

## What should not be treated as legal advice or final evidence

The Phase 1 bundle exists to **shape Phase 2 ingestion**, not to ground any claim about a project, operator, First Nation, or watershed.

- Nothing in `nrta-authorizations.json` is legal advice.
- Nothing in `nrta-authorizations.json` is regulatory evidence.
- The presence of a `SourceRecord` indicates the _registry where verification should occur_, not that any value has been verified against it.
- `placeholder` rows must not be cited downstream as if they contained data. The validator enforces this by requiring `allocatedVolume_m3_per_year` to remain `null` while `ingestionState` is `placeholder`.
- No scraping has been performed. The plan calls for ingestion via public registries, and Phase 2 will perform that ingestion only against the sources enumerated in plan §3.

Each `SourceRecord` carries a `supports` field describing what the registry _can_ support, and a `limitations` array describing access friction (redactions, ATIP requirements, PDF-only delivery). Both should be read before relying on any number sourced from that registry in later phases.

---

## How to extend

1. **To populate a Phase-1 placeholder row** — flip `ingestionState` from `placeholder` to `needs_verification`, drop the field name from `placeholderFields`, populate the numeric value, and confirm the row still passes `npm run check:nrta`. A reviewer should sign off before flipping to `verified`.
2. **To add a new Tier-1 project** — append to `projects[]`, add ≥ 1 `SourceRecord`, append authorization placeholders, and add an `IngestionStatus` row. Re-run `npm run check`.
3. **To promote to a joined content collection (Phase 2)** — wire the bundle's slugs into `evidence.json` / `projects.json` per plan §5 Option A, and extend `src/lib/content.ts` to re-export the NRTA loaders.

---

## Acceptance criteria for Phase 1

Per plan §9, Phase 1 is "done" when:

- [ ] 5 project records exist with allocated volume + source watershed
- [ ] Each cites a public registry entry
- [ ] Each links to a specific evidence-library item (creating new ones where needed)
- [ ] The synthesis chatbot can answer "what's the water consumption of the Capital Power Genesee DC?" with a grounded number and source citation

The foundation in this PR satisfies the **structural** prerequisites for all four checkboxes (5 project records exist; every row cites a registry; the schema supports evidence-library linking; the data is loader-accessible). Filling in the **numbers** that close each acceptance criterion is the Phase 2 ticket — see below.

---

## Recommended Phase 2 ticket

> **NRTA-002 — Populate Tier-1 authorization volumes**
>
> Convert each Phase-1 placeholder authorization row into a `needs_verification` or `verified` row by extracting allocated water volumes from the cited registry (Alberta Authorizations Viewer, EPEA, CER, IOGC). Constraint: do not introduce any number without a per-row `SourceRecord` whose `url` resolves to the specific licence document. Promote `nrta-authorizations.json` to cross-reference `evidence.json` per plan §5 Option A. Out of scope: SK/MB rows (Phase 3) and PPWB / IOGC ATIP ingestion (Phase 4).
