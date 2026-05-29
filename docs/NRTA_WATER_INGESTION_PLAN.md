# NRTA Water-Use Ingestion Plan

A targeted plan to close Treaty-Lab's NRTA water-statistics gap by ingesting per-project water-licence data for projects operating under NRTA-derived provincial jurisdictions (AB / SK / MB).

**Goal:** Move from watershed-level indicators (what we have today) to project-level allocated-vs-consumed volumes (what the synthesis is missing). Anchor each new statistic to a specific evidence-library entry and link projects to the s.1 "existing trusts and interests" doctrinal frame.

---

## 1. Scope

### In scope

- Projects physically located in **Alberta, Saskatchewan, or Manitoba** (the three 1930 NRTA-transferred provinces).
- Projects that **withdraw, discharge, or transport water** above household-trivial volumes — pipelines, oil/gas operators, data centres, mines, generation plants, agricultural diversions on Reserve.
- Projects already referenced in Treaty-Lab synthesis or `projects.json`, plus new candidates surfaced during research.

### Out of scope (for this pass)

- **British Columbia projects** — Cedar LNG, Coastal GasLink (the BC side), Site C, TMX-BC, Yahey area. BC is not an NRTA province; its water regime is the BC _Water Sustainability Act_, not the NRTA-derived legislation.
- **Federal-jurisdiction marine intakes** — Westridge Marine Terminal seawater, etc. Different licensing regime.
- **Household and municipal allocations** unless explicitly raised by a First Nation as a treaty-rights matter.
- **Pre-1930 historic water rights** documented but not currently active.

### Edge cases

- **TMX-AB portion only** — the Edmonton-Hardisty-Kamloops corridor inside Alberta is NRTA. Track Coldwater aquifer concern (already in synthesis) plus AB pump-station water licences.
- **Site C transboundary effects** — the dam is in BC but the Peace River flows through AB and SK; AB monitoring data (MPWA 2024) is already in synthesis. Include downstream effects, not the dam itself.
- **Onion Lake Cree Nation** — Reserve straddles AB/SK border. Water-rights data may live in both provincial registries plus federal IOGC.

---

## 2. Target project inventory (priority-ranked)

### Tier 1 — High leverage, already mentioned in synthesis

| #   | Project                                                        | Jurisdiction                   | Category                      | Why it matters                                                                                                      |
| --- | -------------------------------------------------------------- | ------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | **Capital Power Genesee Data Centre**                          | AB Treaty 6                    | Data centre + power gen       | 1,500 MW PROPOSED — single largest data-centre water cooling load in AB Treaty 6 territory; AESO Phase 2 framework  |
| 2   | **Mihta Askiy / Cree Ative Datacenter**                        | AB Treaty 8 (Woodland Cree FN) | Data centre + natural-gas gen | 650 MW; only FN-led DC in Phase I queue; on traditional lands of Woodland Cree                                      |
| 3   | **Onion Lake Energy**                                          | AB/SK border Treaty 6          | Oil production                | ~120 wells, ~6,000 bbl/day; 100% FN-owned; produced-water disposal / freshwater use is the directly-licensed signal |
| 4   | **Maskwacis Four Nations — Pigeon Lake + Samson reserves O&G** | AB Treaty 6                    | Oil & gas (legacy)            | Historic royalty base (SCC 2009 ruling); contemporary water use under NRTA s.1 trust language                       |
| 5   | **AESO Calgary data-centre cluster**                           | AB Treaty 7                    | Data-centre aggregate         | 3,533 MW aggregate queue; sits in SSRB closed-basin region — water-licence procurement is the bottleneck            |
| 6   | **AESO Edmonton data-centre cluster**                          | AB Treaty 6                    | Data-centre aggregate         | 3,161 MW aggregate queue; NSRB jurisdiction                                                                         |
| 7   | **AESO Northwest data-centre cluster**                         | AB Treaty 8                    | Data-centre aggregate         | 2,200 MW aggregate queue; Peace/Athabasca jurisdiction — already pressure on AXF                                    |
| 8   | **Wapiti / Smoky sub-basin O&G operators**                     | AB Treaty 8                    | Oil & gas aggregate           | 99.64% allocation utilization (indicator); identify the top licensees                                               |

### Tier 2 — In synthesis as case law / financial reference, water dimension implied

| #   | Project / Vehicle                                              | Jurisdiction                                        | Category  | Reason to include                                                                           |
| --- | -------------------------------------------------------------- | --------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------- |
| 9   | **Athabasca Indigenous Investments / Enbridge Oilsands lines** | AB Treaty 6/8                                       | Pipeline  | 11.57% Indigenous equity precedent; lines run through SSRB and Athabasca                    |
| 10  | **Northern Courier / Astisiy**                                 | AB Treaty 8                                         | Pipeline  | 14.25% Indigenous equity; northern AB                                                       |
| 11  | **Access NGL / Northern Lakehead Alliance**                    | AB Treaty 8                                         | Pipeline  | 43% Indigenous equity                                                                       |
| 12  | **Clearwater Midstream / Wapiscanis Waseskwan Nipiy**          | AB Treaty 8                                         | Pipeline  | 85% Indigenous equity (highest share in inventory)                                          |
| 13  | **TMX — AB portion**                                           | AB Treaty 6 (urban Edmonton) → Treaty 7 → BC border | Pipeline  | Coldwater aquifer concern already documented; AB pump-station water licences                |
| 14  | **Suncor / Syncrude Athabasca operations**                     | AB Treaty 8                                         | Oil sands | OSM 2025 watershed reporting (already in evidence library); contemporary Indigenous concern |
| 15  | **Imperial / Cenovus in-situ operations**                      | AB Treaty 8                                         | Oil sands | Same OSM scope                                                                              |

### Tier 3 — SK and MB, currently underrepresented in synthesis

| #   | Project / Operator                                            | Jurisdiction    | Category         | Reason to include                                                                        |
| --- | ------------------------------------------------------------- | --------------- | ---------------- | ---------------------------------------------------------------------------------------- |
| 16  | **SaskPower thermal generation** (Boundary Dam, Poplar River) | SK Treaty 4 / 6 | Coal + gas gen   | Water-cooling allocations; FN ownership absent from current pipeline                     |
| 17  | **Mosaic / Nutrien potash operations**                        | SK Treaty 4 / 6 | Potash mining    | Major SK water-using industry; FN water claims undertested                               |
| 18  | **Pesâkâstêw / Mino Giizis solar**                            | SK Treaty 4     | Renewables       | Indigenous-equity precedents (Treaty 4, not 6 — that asymmetry is the analytical signal) |
| 19  | **Manitoba Hydro Conawapa / Bipole III**                      | MB Treaty 5     | Hydro generation | NCN, Tataskweyak, Cross Lake — major NRTA water-rights stakeholders                      |
| 20  | **Vale Thompson nickel**                                      | MB Treaty 5     | Mining           | Cross-Lake water-quality concerns                                                        |

---

## 3. Source registries

### Provincial water-licence registries

| Province | Registry                                                                                | Access                                        | Granularity                                   | Notes                                      |
| -------- | --------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------- | ------------------------------------------ |
| **AB**   | Alberta EPA / Environment & Protected Areas — Authorizations Viewer (Water Licence Hub) | Public, queryable by licence # / TFC / coords | Allocated m³/yr, source watershed, conditions | Replaces older AENV system                 |
| **AB**   | AEP Industrial Operating Approvals (EPEA)                                               | Public PDFs                                   | Process / cooling water volumes per facility  | Required separately from Water Act licence |
| **SK**   | Saskatchewan Water Security Agency — Water Allocation and Licensing                     | Online portal                                 | Allocated m³/yr; less granular than AB        | Less publicly indexed                      |
| **MB**   | Manitoba Environment & Climate — Water Rights Branch                                    | Application-by-application; not fully online  | Allocated m³/yr                               | May require ATIP for full ledger           |

### Federal / inter-provincial sources

| Source                                                           | Use                                                                         | Access                              |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------- |
| **PPWB Annual Apportionment Reports** (Canada Pub En36-523/YYYY) | Inter-provincial flow ledger AB→SK and SK→MB; actual delivered vs. required | publications.gc.ca free PDFs        |
| **ISC Indigenous Services Canada — Water Quality Reports**       | Reserve drinking-water status, advisories, infrastructure                   | sac-isc.gc.ca                       |
| **IOGC water-licence registry on Reserve**                       | Per-Reserve federally-administered water rights preserved under NRTA s.1    | ATIP likely required                |
| **CER Project Filings**                                          | Federal-jurisdiction pipeline + LNG water permits and conditions            | open data via CER.ca                |
| **OSM (Oil Sands Monitoring) data portal**                       | Athabasca / Peace watershed flow + quality, Indigenous-relevant AXF data    | osm-ber.ca; already partially cited |
| **IAAC project documents**                                       | Project-by-project environmental impact statements (incl. water section)    | iaac-aeic.gc.ca                     |

### Indigenous / NGO sources

- **First Nations Major Projects Coalition (FNMPC)** — equity transactions context
- **Athabasca Chipewyan First Nation, Mikisew Cree FN environmental monitoring** — independent water-quality data
- **Indigenous Climate Hub** — community-led monitoring datasets

---

## 4. Statistics schema (what to ingest per project)

Proposed addition to `EvidenceItem` or `ProjectAssessment` shape, with one row per `(project, water-licence)` pair:

```ts
interface WaterLicenceRecord {
  projectSlug: string; // FK to ProjectAssessment.slug
  licenceNumber: string; // e.g. AB Water Act licence # or IOGC #
  registryProvince: "AB" | "SK" | "MB" | "FEDERAL";
  registryName: string; // e.g. "Alberta Authorizations Viewer"
  sourceWatershed: string; // e.g. "North Saskatchewan River Basin"
  sourceBody: string; // specific river / aquifer / lake
  intendedUse:
    | "process"
    | "cooling"
    | "dewatering"
    | "domestic"
    | "agricultural"
    | "potable"
    | "other";
  allocatedVolume_m3_per_year: number | null;
  actualConsumption_m3_per_year?: number; // latest reported, if available
  consumptionReportingYear?: number;
  conditions: string[]; // e.g. "subject to seasonal restrictions May-Aug"
  firstLicensedAt: string; // ISO date
  amendmentHistory?: Array<{ date: string; change: string }>;
  s35TreatyRightsAcknowledged: boolean; // explicit treaty/s.35 language in licence (predict: rarely)
  consultationDocumented: boolean; // public record of FN consultation pre-issuance
  indigenousConcernsRaised: string[]; // free-text from public submissions
  evidenceSlug: string; // FK to the evidence-library entry that grounds this record
}
```

### Per category — what to actually extract

**Data centres / power generation:**

- Cooling water allocation + return-flow volume (if river-cooling)
- Process water for boilers
- Source water body
- AESO Phase I/II queue position + status

**Oil & gas (upstream + midstream):**

- Freshwater allocation for hydraulic fracturing per pad
- Produced-water disposal volumes + injection-well destinations
- Surface intake locations near First Nation reserves
- AER/CER licence conditions on water use

**Pipelines:**

- Hydrostatic test water volumes (one-time at construction; large)
- Watercourse crossing count + Class assignments
- Spill-response water requirements (theoretical)
- Routing decisions over aquifers (the TMX-Coldwater pattern)

**Mining (oil sands, potash, hard-rock):**

- Tailings pond water inventory
- Annual freshwater intake
- Total water "recycled" claim (often misleading — verify against allocation)
- Watercourse diversion / re-engineering

**Indigenous-led ventures (cross-category):**

- Whether the water licence is held by the FN-owned LP / Corp or by the operating partner
- NRTA s.1 explicit invocation (predict: very rarely)
- Federal IOGC involvement

---

## 5. Output format

### Option A — `src/content/water-licences.json` (recommended)

New content collection alongside `evidence.json` / `projects.json`. Each entry conforms to `WaterLicenceRecord`. Joined to projects via `projectSlug`. Allows independent updates and avoids bloating `projects.json`.

### Option B — Inline under `ProjectAssessment.waterLicences[]`

Add a `waterLicences` array to the `ProjectAssessment` type. Tighter coupling, easier UI rendering, but harder to maintain when one Nation has water rights spanning multiple projects.

### Option C — `.work/agent-out-water-licences.md` synthesis-only

If the schema isn't worth committing yet, treat the first pass as research notes. Easier to start, doesn't change the type system, but data isn't programmatically queryable.

**Recommendation:** Start with **Option C** for the first 5 Tier 1 projects (rapid prototyping), then promote to **Option A** if the data is good enough to drive UI changes.

---

## 6. Execution sequencing

### Phase 1 — Quick wins (5 projects, ~1 week)

Ingest water-licence data for the 5 highest-leverage Tier-1 projects already in synthesis:

1. Capital Power Genesee Data Centre
2. Mihta Askiy / Cree Ative
3. Onion Lake Energy
4. Wapiti/Smoky top O&G licensees (1-2 named operators)
5. TMX AB pump stations

Output: `.work/agent-out-water-licences.md` (Option C). Cite AB Authorizations Viewer + IAAC docs + CER filings.

### Phase 2 — Treaty-7 watershed deep-dive (~1 week)

Per-licence ingestion for Treaty 7 Nations and adjacent industry in the SSRB:

- Blood / Piikani / Siksika water-rights enumeration (NRTA s.1 explicit)
- St. Mary / Belly / Waterton over-allocation by licence #
- Major SSRB industrial licensees (irrigation district allocations dominate — see if 1991 SSRB Reg FN entitlements are still 0-diverted for Piikani)

Output: Schema upgrade to Option A — `src/content/water-licences.json`.

### Phase 3 — SK + MB expansion (~2 weeks)

Tier-3 projects under SK/MB regimes. This is where the data thins out (SK and MB registries are less queryable than AB). May surface a Treaty-4 vs Treaty-6 asymmetry similar to the renewables case (Mino Giizis / Pesâkâstêw).

Output: Additional `water-licences.json` entries; comparative analysis writeup in `.work/`.

### Phase 4 — Federal residual + PPWB ledger (~1-2 weeks)

- ATIP request for IOGC water-licence registry
- Ingestion of PPWB Annual Apportionment Reports 2015-2025 (10-year trend)
- Anchor the NRTA s.10 (reserve lands) federal-trust analysis with actual per-Reserve data

Output: New indicators (PPWB compliance trend; per-Reserve advisory days), new evidence entries (PPWB report series, IOGC ATIP response).

---

## 7. Estimated effort

| Phase | Researcher-days            | Output                                                   |
| ----- | -------------------------- | -------------------------------------------------------- |
| 1     | 4-5                        | Synthesis file with ~5 project records                   |
| 2     | 4-5                        | `water-licences.json` v0.1 with ~15 records              |
| 3     | 8-10                       | `water-licences.json` v0.2 with ~25 records              |
| 4     | 6-8 (gated by ATIP timing) | PPWB indicator series, federal residual evidence entries |

**Total:** ~22-28 researcher-days for a complete first-pass NRTA water-use ledger covering ~25 projects across all three NRTA provinces.

---

## 8. Open questions / decisions needed

1. **Confidentiality of licence data** — AB Authorizations Viewer is public, but some licence conditions are redacted. Decide what to publish vs. flag as `needs_validation`.
2. **Indigenous data sovereignty** — Reserve-level water consumption data may be subject to OCAP principles. Ground the ingestion plan in FNIGC guidance (already in evidence library) before pulling IOGC data.
3. **Update cadence** — Water licences change annually; the platform needs a clear "last verified" date and a re-check schedule.
4. **Indicator-level vs project-level surfacing** — The 8 existing water-domain indicators are watershed-level. The 25 new entries would be project-level. Decide whether to surface them as a separate dashboard or roll up into existing indicators.
5. **AB vs SK vs MB granularity asymmetry** — AB's registry is far better than SK's or MB's. The platform should be honest about which provinces have ground-truth coverage and which are inference-only.

---

## 9. Acceptance criteria

Phase 1 is "done" when:

- [ ] 5 project records exist with allocated volume + source watershed
- [ ] Each cites a public registry entry
- [ ] Each links to a specific evidence-library item (creating new ones where needed)
- [ ] The synthesis chatbot can answer "what's the water consumption of the Capital Power Genesee DC?" with a grounded number and source citation

Phase 2 is "done" when:

- [ ] `water-licences.json` is checked in to the content tree
- [ ] TypeScript types updated and `npm run check:content` validates the new schema
- [ ] At least 1 Treaty 7 Nation (Blood, Piikani, or Siksika) has its NRTA-preserved s.1 water rights enumerated with verifiable volumes

Phases 3 + 4 acceptance criteria to be defined when Phase 2 completes.

---

_This plan is a scoping artifact, not a commitment. Adjust scope, sequencing, and per-tier priority as new evidence surfaces._
