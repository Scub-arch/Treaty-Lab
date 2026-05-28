// NRTA water-use ingestion — Phase 1 type definitions.
//
// Implements the per-project water-licence schema described in
// `docs/NRTA_WATER_INGESTION_PLAN.md` §4, decomposed into five entity types:
//
//   NrtaProject          — a project that falls under NRTA jurisdiction (AB/SK/MB)
//   Authorization        — a single water licence / permit / approval
//   SourceRecord         — citation of the registry or public document supporting a row
//   WaterUseIndicator    — per-project aggregated water-use signal
//   IngestionStatus      — verification / data-quality state for a project's records
//
// Foundation-only: Phase 1 ships placeholder rows for 5 Tier-1 projects. All
// volume fields are nullable and every record MUST carry at least one
// SourceRecord slug. This is enforced by `scripts/check-nrta.mjs` at build
// time and by `validateNrtaBundle()` at runtime.

/** Provinces in scope for NRTA water ingestion (1930 transferred provinces). */
export type NrtaProvince = "AB" | "SK" | "MB";

/** Registry jurisdiction — narrower than NrtaProvince because federal sources exist. */
export type RegistryJurisdiction = NrtaProvince | "FEDERAL";

/** Project category — drives which fields the per-row extractor should populate. */
export type NrtaProjectCategory =
  | "data_centre"
  | "data_centre_cluster"
  | "power_generation"
  | "oil_and_gas_upstream"
  | "oil_and_gas_midstream"
  | "pipeline"
  | "oil_sands"
  | "mining"
  | "hydro"
  | "renewables"
  | "agricultural_diversion";

/** Tier per plan §2 — used to prioritize ingestion order. */
export type NrtaTier = 1 | 2 | 3;

/**
 * Intended water use — taken verbatim from plan §4. Free-form `other` allowed
 * but downstream readers should prefer one of the enumerated values.
 */
export type IntendedWaterUse =
  | "process"
  | "cooling"
  | "dewatering"
  | "domestic"
  | "agricultural"
  | "potable"
  | "hydrostatic_test"
  | "produced_water_disposal"
  | "other";

/**
 * Data-quality state for a row or aggregate. `placeholder` means the row
 * exists as a skeleton with no extracted volumes yet — explicitly NOT a
 * claim about the project. `needs_verification` means a number is present
 * but has not been cross-checked against the primary registry.
 */
export type IngestionState =
  | "placeholder"
  | "needs_verification"
  | "verified"
  | "redacted"
  | "no_data_in_source";

// ---------------------------------------------------------------------------
// Source record
// ---------------------------------------------------------------------------

/**
 * A citation of a public registry, government filing, or other primary
 * document. SourceRecord is required for every Authorization row; the
 * Phase-1 validator rejects any Authorization that does not list at least
 * one `sourceRecordSlug`.
 *
 * Phase 1 keeps SourceRecord self-contained (NOT cross-referenced into
 * `evidence.json`) so the foundation can land without touching the
 * existing content store. Promotion to evidence.json is a Phase 2 concern.
 */
export interface SourceRecord {
  slug: string;
  /** Display name, e.g. "Alberta Authorizations Viewer". */
  registryName: string;
  /** Which legal jurisdiction the registry sits under. */
  jurisdiction: RegistryJurisdiction;
  /** Public URL — registry landing page is acceptable when no per-record permalink exists. */
  url?: string;
  /**
   * Citation in print form when no stable URL exists (e.g. PPWB annual
   * report series in publications.gc.ca catalogue).
   */
  citation?: string;
  /** ISO date the URL or document was last accessed by a human reviewer. */
  accessedAt?: string;
  /** Plain-language summary of what this source contributes — keeps citations honest. */
  supports: string;
  /** Known limits — redactions, access friction, ATIP-only, etc. */
  limitations?: string[];
}

// ---------------------------------------------------------------------------
// NRTA project
// ---------------------------------------------------------------------------

/**
 * A project tracked under NRTA water-use ingestion. Distinct from
 * `ProjectAssessment` in `projects.json`:
 *
 *  - `ProjectAssessment` is the full evidence-anchored project record used
 *    by the UI; it can reference projects anywhere in Canada.
 *  - `NrtaProject` is the narrower NRTA-scoped ingestion target. It may
 *    link to a ProjectAssessment via `linkedProjectSlug` (when a synthesis
 *    record already exists) but is independently maintainable.
 */
export interface NrtaProject {
  slug: string;
  name: string;
  shortName?: string;
  /** Which NRTA province this project sits in. */
  province: NrtaProvince;
  /** Treaty area, when known and public — e.g. "Treaty 6", "Treaty 8". */
  treatyArea?: string;
  category: NrtaProjectCategory;
  tier: NrtaTier;
  /** One-sentence what-it-is. No claims here — descriptive only. */
  summary: string;
  /**
   * Optional FK to `projects.json`. Allows the UI to deep-link when a
   * synthesis assessment already exists. Phase 1 does not require this
   * to resolve, because not every Tier-1 NRTA project has a synthesis
   * project record yet.
   */
  linkedProjectSlug?: string;
  /**
   * Slugs of `SourceRecord`s that ground the existence of this project
   * itself (CER filing, IAAC project page, AESO queue entry, etc.).
   * MUST contain at least one entry.
   */
  sourceRecordSlugs: string[];
}

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

/**
 * A single water licence, approval, or permit. Mirrors plan §4
 * `WaterLicenceRecord` with two changes:
 *
 *  1. `sources` is a list of `sourceRecordSlug`s (not inline objects) so
 *     the same registry entry can ground many rows without duplication.
 *  2. `ingestionState` and `placeholderFields` make the data-quality
 *     state explicit on every row.
 *
 * Phase 1: every row is expected to be `placeholder` with all numeric
 * fields nullable. The schema is present so that Phase 2 ingestion can
 * fill in the volumes without further migrations.
 */
export interface Authorization {
  slug: string;
  projectSlug: string;
  /**
   * Authorization number as issued by the registry. May be `null` in
   * Phase 1 when the licence # has not yet been located in the public
   * registry — the row is then a placeholder pending lookup.
   */
  authorizationNumber: string | null;
  registryJurisdiction: RegistryJurisdiction;
  /** Source watershed at the basin level — e.g. "North Saskatchewan River Basin". */
  sourceWatershed?: string;
  /** Specific river / aquifer / lake — e.g. "Athabasca River". */
  sourceBody?: string;
  intendedUse: IntendedWaterUse;
  /** Allocated volume in m³/yr. Phase 1: null = placeholder, not zero. */
  allocatedVolume_m3_per_year: number | null;
  /**
   * One-time water-use volume in m³ — for licences whose volume is not
   * meaningfully expressed as an annual rate. Examples: TMX hydrostatic
   * test water (construction phase), commissioning fills, single-event
   * dewatering campaigns. Phase 2 addition (NRTA-002 decision #2). Either
   * `allocatedVolume_m3_per_year` OR `oneTimeVolume_m3` must be set for a
   * row to leave `placeholder` state; both may be set if a licence
   * authorizes both annual and one-time draws.
   */
  oneTimeVolume_m3?: number | null;
  /** Actual consumption m³/yr from latest public reporting, if available. */
  actualConsumption_m3_per_year?: number | null;
  /** Year of `actualConsumption_m3_per_year`. */
  consumptionReportingYear?: number;
  /** Licence conditions verbatim, public-record only. */
  conditions?: string[];
  /** ISO date — when the licence was first issued. */
  firstLicensedAt?: string;
  /**
   * Whether the licence text contains explicit s.35 / Treaty-rights
   * language. Phase 1 default is `false` — most provincial licences do not.
   */
  s35TreatyRightsAcknowledged?: boolean;
  /** Whether a public record of First Nation consultation pre-issuance exists. */
  consultationDocumented?: boolean;
  /** Slugs of `SourceRecord`s grounding this row. MUST have ≥ 1 entry. */
  sourceRecordSlugs: string[];
  /**
   * Set when the authorization sits in a different province (or registry
   * jurisdiction) than its parent `NrtaProject.province`. Marks the row
   * for cross-border verification handling — most commonly when a
   * First Nation reserve or operation straddles a provincial border
   * (e.g. Onion Lake Reserve on the AB/SK line). Free-form note; intended
   * to signal "do not treat this as an Alberta authorization record" when
   * the project's primary province is Alberta but the licence lives in
   * another registry. Phase 2 addition (NRTA-002 decision #3).
   */
  crossBorderNote?: string;
  /** Data-quality state for this row. Phase 1 default is `placeholder`. */
  ingestionState: IngestionState;
  /**
   * Field names that are currently placeholders and require manual
   * verification before being treated as evidence. Phase 1 typically
   * lists `allocatedVolume_m3_per_year`, `actualConsumption_m3_per_year`,
   * `authorizationNumber`.
   */
  placeholderFields?: string[];
  /**
   * Free-text note explaining what manual verification is required. NOT
   * a place for private or community-sensitive content.
   */
  reviewerNote?: string;
}

// ---------------------------------------------------------------------------
// Water-use indicator
// ---------------------------------------------------------------------------

/**
 * Per-project aggregated water-use signal. Computed from one or more
 * `Authorization`s. Distinct from the watershed-level `Indicator` records
 * in `indicators.json` — this is the project-level rollup the synthesis
 * is missing per plan §1.
 *
 * Phase 1: aggregates may be `null` because the underlying authorizations
 * are placeholders. The presence of the WaterUseIndicator row in the
 * foundation tells the UI "this project will have a number here later".
 */
export interface WaterUseIndicator {
  slug: string;
  projectSlug: string;
  name: string;
  /** What the indicator measures, plain-language. */
  description: string;
  /** Numeric value once authorizations are populated. */
  value: number | null;
  unit: "m3_per_year" | "m3_per_day" | "percent_of_basin_allocation";
  /** Authorization slugs this rolls up. */
  computedFromAuthorizationSlugs: string[];
  /** ISO date of last computation. */
  computedAt?: string;
  /** State of the underlying data. */
  ingestionState: IngestionState;
  /** Source records that ground the rollup (typically inherited from authorizations). */
  sourceRecordSlugs: string[];
}

// ---------------------------------------------------------------------------
// Ingestion status
// ---------------------------------------------------------------------------

/**
 * Verification / outstanding-work tracker per NRTA project. One row per
 * project — even if the project has many authorizations. Used by the
 * Phase-1 validator to surface "what is still placeholder" without
 * walking every authorization row.
 */
export interface IngestionStatus {
  slug: string;
  projectSlug: string;
  overallState: IngestionState;
  /** Phase that produced this status row. */
  phase: 1 | 2 | 3 | 4;
  /** ISO date last reviewed by a human. */
  lastReviewedAt: string;
  /** Concrete next steps required before this project can leave placeholder state. */
  outstandingTasks: string[];
  /**
   * Per plan §8.2 — note if the data is subject to Indigenous-data
   * sovereignty principles (OCAP / FNIGC) and what restrictions apply.
   */
  dataSovereigntyNote?: string;
}

// ---------------------------------------------------------------------------
// Bundle wrapper
// ---------------------------------------------------------------------------

/**
 * Container shape for `src/content/nrta-authorizations.json`. The Phase-1
 * validator walks this bundle top-down.
 */
export interface NrtaBundle {
  /** Schema version — bump when shape changes. */
  version: string;
  /** ISO date this bundle was last assembled. */
  generatedAt: string;
  /** Which plan phase produced this bundle (1 for the foundation). */
  phase: 1 | 2 | 3 | 4;
  /** Top-level disclaimer surfaced wherever this data is consumed. */
  disclaimer: string;
  sourceRecords: SourceRecord[];
  projects: NrtaProject[];
  authorizations: Authorization[];
  waterUseIndicators: WaterUseIndicator[];
  ingestionStatus: IngestionStatus[];
}
