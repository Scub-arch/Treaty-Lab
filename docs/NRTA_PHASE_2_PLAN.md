# NRTA-002 — Tier-1 Authorization Volume Verification Plan

Phase 2 plan for converting Phase 1 placeholder authorization rows into
`needs_verification` or `verified` rows with extracted volumes and per-row
source citations. **This document is planning only.** It does not modify
JSON data, scrape registries, or make legal conclusions.

Pair with:
- [`NRTA_WATER_INGESTION_PLAN.md`](./NRTA_WATER_INGESTION_PLAN.md) — overall multi-phase plan (Phases 1-4).
- [`NRTA_PHASE_1_README.md`](./NRTA_PHASE_1_README.md) — Phase 1 deliverables and the verbatim NRTA-002 ticket text.

---

## 1. Tier-1 projects being verified

Five projects, taken verbatim from `src/content/nrta-authorizations.json` `projects[]`. All five are currently in `placeholder` state with `null` volumes.

| # | `projects[].slug` | Name | Province | Treaty area | Category |
|---|---|---|---|---|---|
| 1 | `capital-power-genesee-data-centre` | Capital Power Genesee Data Centre | AB | Treaty 6 | `data_centre` |
| 2 | `mihta-askiy-cree-ative-datacentre` | Mihta Askiy / Cree Ative Data Centre | AB | Treaty 8 | `data_centre` |
| 3 | `onion-lake-energy` | Onion Lake Energy | AB (Reserve straddles SK) | Treaty 6 | `oil_and_gas_upstream` |
| 4 | `wapiti-smoky-og-aggregate` | Wapiti / Smoky sub-basin O&G aggregate | AB | Treaty 8 | `oil_and_gas_upstream` |
| 5 | `tmx-ab-pump-stations` | TMX — Alberta pump-station water licences | AB | Treaty 6 / Treaty 7 | `pipeline` |

**Out of scope (deferred to later phases):**

- SK and MB projects — Phase 3 per `NRTA_WATER_INGESTION_PLAN.md` §6.
- PPWB inter-provincial apportionment ledger ingestion — Phase 4.
- IOGC ATIP-gated federal registry access — Phase 4.
- Treaty 7 SSRB First Nation entitlement enumeration (Blood / Piikani / Siksika) — Phase 2 in the original plan, deferred from NRTA-002.
- BC-side TMX, Cedar LNG, Coastal GasLink, Site C — out of NRTA jurisdiction entirely.

---

## 2. Authorization records needing volume verification

Seven authorization rows currently exist. All are `ingestionState: "placeholder"` and all `allocatedVolume_m3_per_year` are `null`.

| # | `authorizations[].slug` | Intended use | Registry jur. | Notes |
|---|---|---|---|---|
| 1 | `capital-power-genesee-water-licence-placeholder` | `cooling` | AB | Cooling water for the Genesee site; check AB Authorizations Viewer + EPEA. |
| 2 | `mihta-askiy-water-licence-placeholder` | `cooling` | AB | May not yet have a public licence — project at AESO Phase I queue stage. |
| 3 | `onion-lake-energy-freshwater-placeholder` | `process` | AB | Reserve straddles AB/SK border — split into per-province rows is in scope. |
| 4 | `onion-lake-energy-produced-water-placeholder` | `produced_water_disposal` | AB | Disposal volumes are separately licensed (AER, not the Water Act licence). |
| 5 | `wapiti-smoky-og-allocation-placeholder` | `process` | AB | Aggregate placeholder. Phase 2 must replace this with per-licensee rows for the top 1-2 operators identified. |
| 6 | `tmx-ab-pump-station-hydrostatic-test-placeholder` | `hydrostatic_test` | FEDERAL | One-time construction volume reported in CER filings (not an annual rate — see Risks §8). |
| 7 | `tmx-ab-pump-station-operational-water-placeholder` | `process` | AB | One row per pump station may be appropriate once enumerated. |

### Expected post-Phase-2 row count

- 4 rows promoted to `needs_verification` or `verified` in place (`#1`, `#3`, `#4`, `#7`).
- Row `#2` (Mihta Askiy) likely lands at `no_data_in_source` if no public application yet (see §8).
- Row `#5` (Wapiti/Smoky) replaced by 2 per-licensee rows → net +1 row.
- Row `#6` (TMX hydrostatic) keeps non-annual semantics (see §8) — may need a schema decision.
- TMX operational row `#7` may split into one-row-per-pump-station — net +N rows once stations are enumerated.

Net rough estimate: `~10-15 authorization rows` post-Phase-2 vs. 7 today.

---

## 3. Fields to fill from Alberta Authorizations Viewer

Per `src/lib/nrta/types.ts::Authorization`, the per-row fields a reviewer extracts from a single AB licence record:

| Field | Type | Source in registry | Required for `needs_verification`? |
|---|---|---|---|
| `authorizationNumber` | string | Licence # / TFC | **Yes** |
| `allocatedVolume_m3_per_year` | number | "Quantity" column on the licence record | **Yes** |
| `sourceWatershed` | string | Basin field on the licence record | **Yes** |
| `sourceBody` | string | Specific river/aquifer/lake on the licence | Recommended |
| `intendedUse` | enum | "Purpose" / "Use" field, mapped to the `IntendedWaterUse` enum | Already set from Phase 1 |
| `firstLicensedAt` | ISO date | "Effective date" / "First issued" field | **Yes** |
| `conditions` | string[] | Conditions section of the licence text | Recommended if non-empty |
| `actualConsumption_m3_per_year` | number? | Annual reporting summary, if disclosed | Optional |
| `consumptionReportingYear` | number? | Year of the reported consumption | Optional (required if `actualConsumption_m3_per_year` set) |
| `s35TreatyRightsAcknowledged` | boolean? | Read the licence text — explicit s.35 / Treaty wording? Almost always `false` for AB Water Act licences. | Optional |
| `consultationDocumented` | boolean? | Look for an attached consultation record or pre-issuance FN engagement note in the registry. | Optional |

### Source-citation requirements per row

The row's `sourceRecordSlugs` array must reference one or more `SourceRecord` entries. Each cited `SourceRecord` should:
- Have a `url` that resolves to a public registry page or licence record.
- Have an `accessedAt` ISO date set by the human reviewer.
- Have a `supports` field that names what specifically the registry supports for THIS row (not generic).

If the data is sourced from a registry **landing page** rather than a per-licence permalink, the row should land in `needs_verification`, not `verified`.

---

## 4. Fields required before `needs_verification` → `verified`

A reviewer may flip a row from `needs_verification` to `verified` only when **all** of the following hold (no exceptions):

1. **`authorizationNumber` is set** — a real registry identifier, not a placeholder.
2. **`allocatedVolume_m3_per_year` is non-null** and matches the value shown in the cited registry record.
3. **`sourceWatershed` is set.**
4. **`firstLicensedAt` is set** as a valid ISO date.
5. **`placeholderFields` is `[]` or absent.**
6. **At least one `SourceRecord` cited resolves to a per-licence permalink** (not the registry homepage). That `SourceRecord` has `url` AND `accessedAt` set.
7. **The licence text was read in full** — `conditions[]` either populated verbatim or explicitly noted as "none" via a reviewer note.
8. **A reviewer has updated the corresponding `IngestionStatus.lastReviewedAt`** to the current date, and reduced `outstandingTasks[]` to `[]` (or noted what residual work remains for higher phases).
9. **No `dataSovereigntyNote` blocker** — for rows with a `dataSovereigntyNote` on the `IngestionStatus` (Mihta Askiy, Onion Lake), public-registry data may proceed; community-relevant or Reserve-level data may NOT be promoted to `verified` without explicit FN governance sign-off (see §8).

If any criterion fails, the row stays at `needs_verification` and the `reviewerNote` explains why.

### Optional new field

This plan **recommends but does not require** adding a per-row `lastVerifiedAt` ISO date field to the `Authorization` interface. Today, verification timestamp lives on `IngestionStatus.lastReviewedAt`, which is per-project. Per-row timestamps would be more precise for projects where rows are verified in batches. Decision deferred to §9 implementation steps.

---

## 5. Acceptable source evidence

**Acceptable** for a `verified` row:

- **Per-licence permalink in the AB Authorizations Viewer** — the URL drills down to the specific licence record (containing the licence # or returned by a reproducible search).
- **EPEA approval PDF** with the document ID and publication date visible.
- **IAAC project page** with an explicit water-use section AND a project file # / IAAC reference number.
- **CER filing** with a permalink to the specific filing and the water-use figures inline.
- **Provincial gazette publication** of a licence amendment.
- **Operator's regulatory filing** (e.g. annual return, AER Directive 60 submission) — only when the figure is public and identifiable.

**Acceptable** for a `needs_verification` row (lower bar — number is in the data but pending review):

- A registry landing-page URL plus a description of how the reviewer found the value.
- A press release or operator disclosure that names the licence # and volume — pending cross-check against the registry.

**Not acceptable** as a source for any non-`placeholder` row:

- News articles, opinion pieces, blog posts.
- Wikipedia, secondary encyclopedias.
- Treaty-Lab's own `.work/agent-out-*.md` synthesis files.
- Social media / press scrums.
- Industry-association marketing material that does not cite the underlying licence.
- Registry homepages without per-record drill-down (these are acceptable on `SourceRecord` but a row that ONLY cites a homepage cannot be `verified`).

### Citation-honesty rules

- Every `SourceRecord` cited by a `verified` row must already have its `supports` and `limitations` fields filled honestly. If a licence's conditions section is redacted in the public viewer, the `SourceRecord.limitations` array must say so.
- `accessedAt` is set at the date of human review, not at the date the row is committed.
- If a number was retrieved via a search that returned multiple licences, the `reviewerNote` should record the search terms used, so a future reviewer can reproduce the lookup.

---

## 6. Files that would change

Phase 2 implementation work — broken out by file. **This planning commit does not change any of these.** They are listed so the next commit's scope is unambiguous.

### Data (highest churn)

- `src/content/nrta-authorizations.json`
  - Up to 7 existing authorization rows: state transitions + populated fields.
  - +1 row from Wapiti/Smoky aggregate → per-licensee split.
  - Possibly +N rows from TMX pump-station enumeration.
  - 5 `WaterUseIndicator` rows recompute once underlying authorizations resolve.
  - 5 `IngestionStatus` rows update `lastReviewedAt` + reduce `outstandingTasks`.
  - Possibly +1 `SourceRecord` for SK Water Security Agency (only if Onion Lake's SK row is in scope this phase) — flag as optional.
  - Possibly +1 `SourceRecord` for an AER produced-water disposal directive (Onion Lake row 4).
  - `version` field bumped from `0.1.0-phase1` to `0.2.0-phase2`.
  - `generatedAt` updated.
  - `phase` field updated from `1` to `2`.

### Schema (low churn)

- `src/lib/nrta/types.ts`
  - **Optional:** add `lastVerifiedAt?: string` to `Authorization` (see §4 deferred decision).
  - No other type changes anticipated.

### Validators (medium churn)

- `scripts/check-nrta.mjs` — add new rules per §7.
- `src/lib/nrta/data.ts::validateNrtaBundle` — mirror the new rules in the TypeScript path.

### Docs (low churn)

- `docs/NRTA_PHASE_1_README.md`
  - Small appendix or migration note pointing at the Phase 2 outcome.
  - Or leave unchanged if Phase 2 lands as its own README.
- `docs/NRTA_PHASE_2_README.md` (new — *if Phase 2 follows the Phase 1 pattern*).

### Out of scope this phase

- `src/content/evidence.json` — no cross-reference promotion this phase. The original NRTA-002 ticket text in the Phase 1 README mentioned an Option-A promotion; this plan **defers it** because volume verification can land cleanly without touching `evidence.json`, and the Option-A promotion is more easily reviewed as its own PR.
- `src/content/projects.json`, `src/content/indicators.json` — untouched.
- `src/app/**/*.tsx` — no UI changes this phase. UI surfacing of NRTA data is a separate ticket.

---

## 7. Validation rules to add

The current `scripts/check-nrta.mjs` enforces (Phase 1):
1. Slug uniqueness per collection.
2. Every project / authorization / WUI cites ≥ 1 source record.
3. Authorization references a known project.
4. WUI references known authorizations + project.
5. IngestionStatus references a known project.
6. `placeholder` rows MUST keep `allocatedVolume_m3_per_year` as `null`.

Phase 2 adds (proposed; subject to review before the next implementation commit):

| # | Rule | Trigger | Enforcement level |
|---|---|---|---|
| P2-V1 | If `ingestionState === "needs_verification"`, `allocatedVolume_m3_per_year` MUST be non-null. | per authorization row | error |
| P2-V2 | If `ingestionState === "verified"`, `authorizationNumber` MUST be non-null. | per authorization row | error |
| P2-V3 | If `ingestionState === "verified"`, `allocatedVolume_m3_per_year` MUST be non-null. | per authorization row | error |
| P2-V4 | If `ingestionState === "verified"`, `firstLicensedAt` MUST be a non-empty ISO date. | per authorization row | error |
| P2-V5 | If `ingestionState === "verified"`, `sourceWatershed` MUST be non-empty. | per authorization row | error |
| P2-V6 | If `ingestionState === "verified"`, at least one cited `SourceRecord` MUST have `url` set AND `accessedAt` set. | per authorization row | error |
| P2-V7 | If `ingestionState !== "placeholder"`, `placeholderFields` MUST be `[]` or absent. | per authorization row | error |
| P2-V8 | `WaterUseIndicator.computedFromAuthorizationSlugs` MUST not be empty when `ingestionState !== "placeholder"`. | per WUI | error |
| P2-V9 | `allocatedVolume_m3_per_year` MUST be `>= 0` when non-null. Negative values rejected. | per authorization row | error |
| P2-V10 | `allocatedVolume_m3_per_year` MUST be `<= 1e10` when non-null (sanity bound; ~31,700 m³/s — physically implausible for a single licence). | per authorization row | error |
| P2-V11 | `consumptionReportingYear` MUST be present when `actualConsumption_m3_per_year` is non-null. | per authorization row | error |
| P2-V12 | Disclaimer string MUST still be present at the bundle root. | bundle | error |
| P2-V13 | `version` MUST start with `0.2.0-phase2` for any bundle where `phase === 2`. | bundle | error |
| P2-V14 | Any row whose project has `dataSovereigntyNote` MUST stay at `needs_verification` (NOT `verified`) unless an explicit `governanceSignOffAt` ISO date is present. (Requires new optional field, OR enforce via a reviewer-note convention — decide in §9.) | per authorization row | error |

These rules apply only to the bundle's own self-consistency. They do not validate the licence numbers against external registries — that's still a human reviewer's job.

---

## 8. Risks, uncertainties, and no-go claims

### Project-specific risks

1. **Mihta Askiy may have no public water-licence yet** (project at AESO Phase I queue stage). The right outcome may be `ingestionState: "no_data_in_source"` with a `reviewerNote` describing what was searched and where. Do NOT fabricate a placeholder volume.

2. **Wapiti/Smoky operator identification is search-heavy.** The AB Authorizations Viewer doesn't natively rank licensees by basin volume. May require operator-by-operator lookup against the basin allocation utilization indicator (99.64%) cited in the plan. If the top licensees can't be cleanly identified from public registry data, the aggregate placeholder should stay until they can.

3. **TMX hydrostatic-test water is a one-time construction volume, not an annual rate.** The current schema's `allocatedVolume_m3_per_year` doesn't model this cleanly. Three candidate decisions:
   - (a) Annualize over the construction window — captures the magnitude but obscures the one-time-ness.
   - (b) Leave `allocatedVolume_m3_per_year` as null and add a new optional `oneTimeVolume_m3` field — schema change.
   - (c) Use `no_data_in_source` and capture the volume only in `reviewerNote` — punts on the data model.
   This plan **does not pick** — flag for a schema decision before the next commit.

4. **Onion Lake produced-water disposal** is licensed under AER directives, not the Water Act licence registry. The current `SourceRecord` set doesn't include an AER directive source — Phase 2 may need to add one (`ab-aer-produced-water` or similar).

5. **Onion Lake AB/SK split** — the Reserve straddles the border. Producing one row per province aligns with the Phase 1 outstanding task list. SK rows would normally be Phase 3 per the master plan. Decision: do we (a) include the SK side in Phase 2 since the Reserve is unified, or (b) stay strict to NRTA-002's "AB-only" framing? This plan **recommends option (a)** for Onion Lake specifically — split into AB row + SK row — because the project is a single Indigenous-led economic operation that doesn't honor the provincial line; treating it as one project with two registry sources is more faithful to the data.

### Process / governance risks

6. **`dataSovereigntyNote` rows (Mihta Askiy, Onion Lake)** — per Phase 1 outstanding tasks: Phase 2 must limit ingestion to public-registry fields only and defer Reserve-level / community-relevant data pending FN governance sign-off. **No-go for this phase:**
   - Pulling Reserve-internal water-use data from IOGC ATIP releases (Phase 4).
   - Publishing data that the Woodland Cree FN or Onion Lake Cree Nation has not endorsed.
   - Asserting facts about FN water rights from licence absence (a missing licence is not evidence of absence of right).

### Data-quality risks

7. **Redactions in the AB Authorizations Viewer** — some conditions are redacted. Rows where conditions can't be captured verbatim should either accept that `conditions[]` is partial (and note in `reviewerNote`) or land at `ingestionState: "redacted"`.

8. **Reproducibility of searches.** When the AB Authorizations Viewer doesn't expose per-licence permalinks, the `reviewerNote` should record the search terms used so a future reviewer can find the same licence.

9. **`accessedAt` drift.** Licence records can be amended without the registry exposing a clear change-log. Phase 2 rows should be re-verified on a stated cadence (recommend annually).

### No-go claims for this phase

Phase 2 produces **descriptive data about registry records**. It does NOT produce, and is NOT to be cited as:

- A legal claim about the validity of any licence.
- A claim that any project complies with, or violates, treaty rights.
- A claim about whether NRTA s.1 "existing trusts and interests" preserved any specific water right for any First Nation.
- A claim about whether consultation pre-issuance met the Crown's honour-of-the-Crown / s.35 obligations.
- A water-use ranking, leaderboard, or "worst polluter" framing.
- A quantitative comparison between operators that does not normalize for licensed capacity, basin context, and reporting completeness.

Anything in those categories belongs in legal advice, regulatory filings, or peer-reviewed scholarship — not in this dataset.

---

## 9. Exact implementation steps for the next commit

The next commit is **planning + validator scaffolding only**. JSON data and the registry pulls happen in the commit after that. This split keeps the change small and reviewable.

### Step-by-step (next commit on `nrta-002-authorization-volumes`)

1. **Add this planning doc.** `docs/NRTA_PHASE_2_PLAN.md` (this file). One file added, no other repo changes.
2. **Commit:** `docs(nrta-002): add Phase 2 verification plan`.
3. **Push** with `git push --set-upstream origin nrta-002-authorization-volumes`.

### Subsequent commits (separate PRs or batched, reviewer's choice)

- **Commit B — schema + validators.**
  - If decided in §4, add `lastVerifiedAt?: string` to `Authorization` in `src/lib/nrta/types.ts`.
  - If decided in §8 risk #3, add `oneTimeVolume_m3?: number` to handle TMX hydrostatic.
  - Implement rules P2-V1 through P2-V14 in `scripts/check-nrta.mjs`.
  - Mirror rules in `src/lib/nrta/data.ts::validateNrtaBundle`.
  - Confirm `npm run check:nrta` still passes on the unchanged Phase 1 data.
  - Confirm `npm run check` still passes.
  - Commit message: `feat(nrta): add Phase 2 validation rules`.

- **Commit C — per-project data updates.** One commit per project is cleanest, but batching is acceptable.
  - Capital Power Genesee: populate row 1, update `status-capital-power-genesee`, update WUI.
  - TMX AB pump stations: populate rows 6 and 7 (or split row 7 into per-station rows), update `status-tmx-ab-pump-stations`, update WUI.
  - Onion Lake Energy: split row 3 into AB + SK if §8 risk #5 option (a) accepted; populate; add AER directive source if §8 risk #4 confirms; update status row + WUI.
  - Wapiti/Smoky: identify top licensees; split row 5 into 2 per-licensee rows; deprecate aggregate row OR keep as derived rollup.
  - Mihta Askiy: likely lands at `no_data_in_source`; update status row to reflect "no public licence at queue stage".
  - Bundle: bump `version` to `0.2.0-phase2`, `phase` to `2`, `generatedAt` to current date.
  - Run `npm run check:nrta` after each project commit.
  - Commit messages: `data(nrta-002): populate <project-slug> authorization volumes`.

- **Commit D — Phase 2 README + outcome doc.**
  - Write `docs/NRTA_PHASE_2_README.md` mirroring the Phase 1 README structure (what shipped, what's still placeholder, acceptance criteria status).
  - Commit message: `docs(nrta-002): add Phase 2 README and outcome doc`.

### Before opening the Phase 2 PR

- All commits on `nrta-002-authorization-volumes`.
- `npm run check`, `npm run check:nrta`, `npm run lint`, `npm run format:check`, `npm run build` all pass.
- PR description references this plan doc.
- Spot-check at least one `verified` row by following its `SourceRecord.url` to confirm the licence record is reachable and matches the row.

---

## 10. Acceptance criteria for Phase 2

Phase 2 is "done" when:

- [ ] Each of the 5 Tier-1 projects has at least one authorization row in `needs_verification` or `verified` state OR an `IngestionStatus` row explaining why `no_data_in_source` was the right outcome.
- [ ] No row has `ingestionState: "verified"` without satisfying all 9 §4 criteria.
- [ ] No row's volume number lacks a per-licence-permalink `SourceRecord`.
- [ ] `scripts/check-nrta.mjs` enforces rules P2-V1 through P2-V14.
- [ ] `npm run check` passes end-to-end.
- [ ] At least one project (recommend Capital Power Genesee) reaches `ingestionState: "verified"`.
- [ ] Phase 1 acceptance criterion #4 — "the synthesis chatbot can answer 'what's the water consumption of the Capital Power Genesee DC?' with a grounded number and source citation" — is satisfied for at least one project, with the citation pointing at a real licence record.

Phase 3 acceptance criteria remain as defined in `NRTA_WATER_INGESTION_PLAN.md` §9.

---

*This plan is a scoping artifact, not a commitment. Adjust as registry access reveals what's actually available.*
