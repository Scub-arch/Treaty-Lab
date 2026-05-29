/**
 * NRTA water-use ingestion — Phase 1 loaders and runtime validator.
 *
 * Phase 1 deliberately ships a self-contained module: it does NOT import
 * from `@/lib/content` because the NRTA bundle is independent of the
 * existing evidence/projects content collections (per plan §5 Option C).
 *
 * Promotion to a fully-joined Option-A content collection is a Phase 2
 * concern and will reuse these loaders.
 */

import nrtaJson from "@/content/nrta-authorizations.json";
import type {
  Authorization,
  IngestionStatus,
  NrtaBundle,
  NrtaProject,
  SourceRecord,
  WaterUseIndicator,
} from "@/lib/nrta/types";

const bundle = nrtaJson as unknown as NrtaBundle;

export function getNrtaBundle(): NrtaBundle {
  return bundle;
}

export function getNrtaProjects(): NrtaProject[] {
  return bundle.projects;
}

export function getNrtaProject(slug: string): NrtaProject | undefined {
  return bundle.projects.find((p) => p.slug === slug);
}

export function getAuthorizations(): Authorization[] {
  return bundle.authorizations;
}

export function getAuthorizationsForProject(projectSlug: string): Authorization[] {
  return bundle.authorizations.filter((a) => a.projectSlug === projectSlug);
}

export function getSourceRecords(): SourceRecord[] {
  return bundle.sourceRecords;
}

export function getSourceRecord(slug: string): SourceRecord | undefined {
  return bundle.sourceRecords.find((s) => s.slug === slug);
}

export function getWaterUseIndicators(): WaterUseIndicator[] {
  return bundle.waterUseIndicators;
}

export function getIngestionStatusForProject(projectSlug: string): IngestionStatus | undefined {
  return bundle.ingestionStatus.find((s) => s.projectSlug === projectSlug);
}

// ---------------------------------------------------------------------------
// Runtime validator
// ---------------------------------------------------------------------------

export type NrtaValidationErrorKind =
  | "duplicate_slug"
  | "missing_source_record"
  | "missing_source_ref"
  | "missing_project_ref"
  | "missing_authorization_ref"
  | "missing_required_field"
  | "claim_without_source"
  // Phase 2 additions
  | "state_invariant_violation"
  | "out_of_bounds";

export interface NrtaValidationError {
  location: string;
  kind: NrtaValidationErrorKind;
  detail: string;
}

export interface NrtaValidationResult {
  ok: boolean;
  errors: NrtaValidationError[];
  inspected: {
    projects: number;
    authorizations: number;
    sourceRecords: number;
    waterUseIndicators: number;
    ingestionStatus: number;
  };
}

/**
 * Walk the NRTA bundle and verify:
 *   - every slug is unique within its collection
 *   - every `sourceRecordSlugs` array has ≥ 1 entry that resolves
 *   - every authorization references a known project
 *   - every water-use indicator references known authorizations
 *   - every ingestion-status row references a known project
 *
 * Mirrors the logic in `scripts/check-nrta.mjs` (the CI gate). Kept in
 * TypeScript here for in-app / test-suite use.
 */
export function validateNrtaBundle(input: NrtaBundle = bundle): NrtaValidationResult {
  const errors: NrtaValidationError[] = [];

  const sourceSlugs = new Set(input.sourceRecords.map((s) => s.slug));
  const projectSlugs = new Set(input.projects.map((p) => p.slug));
  const authorizationSlugs = new Set(input.authorizations.map((a) => a.slug));

  // Uniqueness ---------------------------------------------------------------
  checkUnique(input.sourceRecords, "sourceRecords", errors);
  checkUnique(input.projects, "projects", errors);
  checkUnique(input.authorizations, "authorizations", errors);
  checkUnique(input.waterUseIndicators, "waterUseIndicators", errors);
  checkUnique(input.ingestionStatus, "ingestionStatus", errors);

  // Projects -----------------------------------------------------------------
  for (const p of input.projects) {
    const root = `projects[${p.slug}]`;
    if (!p.sourceRecordSlugs?.length) {
      errors.push({
        location: `${root}.sourceRecordSlugs`,
        kind: "claim_without_source",
        detail: "NRTA project must cite at least one source record",
      });
    } else {
      for (const [i, s] of p.sourceRecordSlugs.entries()) {
        if (!sourceSlugs.has(s)) {
          errors.push({
            location: `${root}.sourceRecordSlugs[${i}]`,
            kind: "missing_source_ref",
            detail: `unknown source record slug "${s}"`,
          });
        }
      }
    }
  }

  // Phase 2 helpers ----------------------------------------------------------
  const sourceBySlug = new Map(input.sourceRecords.map((s) => [s.slug, s]));
  const statusByProject = new Map(input.ingestionStatus.map((s) => [s.projectSlug, s]));
  const MAX_VOLUME = 1e10;

  const hasVolumeData = (a: Authorization): boolean =>
    (a.allocatedVolume_m3_per_year !== null && a.allocatedVolume_m3_per_year !== undefined) ||
    (a.oneTimeVolume_m3 !== null && a.oneTimeVolume_m3 !== undefined);

  const hasQualifiedSource = (a: Authorization): boolean =>
    (a.sourceRecordSlugs ?? []).some((slug) => {
      const s = sourceBySlug.get(slug);
      return s !== undefined && !!s.url && !!s.accessedAt;
    });

  // Authorizations -----------------------------------------------------------
  for (const a of input.authorizations) {
    const root = `authorizations[${a.slug}]`;
    if (!projectSlugs.has(a.projectSlug)) {
      errors.push({
        location: `${root}.projectSlug`,
        kind: "missing_project_ref",
        detail: `unknown project slug "${a.projectSlug}"`,
      });
    }
    if (!a.sourceRecordSlugs?.length) {
      errors.push({
        location: `${root}.sourceRecordSlugs`,
        kind: "claim_without_source",
        detail: "authorization row must cite at least one source record",
      });
    } else {
      for (const [i, s] of a.sourceRecordSlugs.entries()) {
        if (!sourceSlugs.has(s)) {
          errors.push({
            location: `${root}.sourceRecordSlugs[${i}]`,
            kind: "missing_source_ref",
            detail: `unknown source record slug "${s}"`,
          });
        }
      }
    }

    // ---- Phase 2 rules ----

    // P2-V1: needs_verification requires volume data.
    if (a.ingestionState === "needs_verification" && !hasVolumeData(a)) {
      errors.push({
        location: `${root}.allocatedVolume_m3_per_year`,
        kind: "state_invariant_violation",
        detail:
          "needs_verification row must have non-null allocatedVolume_m3_per_year or oneTimeVolume_m3",
      });
    }

    // P2-V2 / V3 / V4 / V5 / V6: verified row invariants.
    if (a.ingestionState === "verified") {
      if (!a.authorizationNumber) {
        errors.push({
          location: `${root}.authorizationNumber`,
          kind: "state_invariant_violation",
          detail: "verified row must have a non-null authorizationNumber",
        });
      }
      if (!hasVolumeData(a)) {
        errors.push({
          location: `${root}.allocatedVolume_m3_per_year`,
          kind: "state_invariant_violation",
          detail: "verified row must have non-null allocatedVolume_m3_per_year or oneTimeVolume_m3",
        });
      }
      if (!a.firstLicensedAt) {
        errors.push({
          location: `${root}.firstLicensedAt`,
          kind: "state_invariant_violation",
          detail: "verified row must have firstLicensedAt set",
        });
      }
      if (!a.sourceWatershed) {
        errors.push({
          location: `${root}.sourceWatershed`,
          kind: "state_invariant_violation",
          detail: "verified row must have sourceWatershed set",
        });
      }
      if (!hasQualifiedSource(a)) {
        errors.push({
          location: `${root}.sourceRecordSlugs`,
          kind: "state_invariant_violation",
          detail:
            "verified row must cite at least one SourceRecord with both url and accessedAt set",
        });
      }

      // P2-V14: Indigenous-data-sovereignty gate.
      const status = statusByProject.get(a.projectSlug);
      if (status && status.dataSovereigntyNote) {
        errors.push({
          location: `${root}.ingestionState`,
          kind: "state_invariant_violation",
          detail:
            "cannot be verified while project's IngestionStatus has dataSovereigntyNote — Indigenous-data-sovereignty gate",
        });
      }
    }

    // P2-V7: non-placeholder rows must not carry placeholderFields entries.
    if (
      a.ingestionState !== "placeholder" &&
      Array.isArray(a.placeholderFields) &&
      a.placeholderFields.length > 0
    ) {
      errors.push({
        location: `${root}.placeholderFields`,
        kind: "state_invariant_violation",
        detail: `non-placeholder row must have empty placeholderFields (found: ${a.placeholderFields.join(", ")})`,
      });
    }

    // P2-V9 / V10: numeric bounds on populated volume fields.
    const volumeFields = [
      "allocatedVolume_m3_per_year",
      "oneTimeVolume_m3",
      "actualConsumption_m3_per_year",
    ] as const;
    for (const field of volumeFields) {
      const v = a[field];
      if (v === null || v === undefined) continue;
      if (typeof v !== "number" || Number.isNaN(v)) {
        errors.push({
          location: `${root}.${field}`,
          kind: "out_of_bounds",
          detail: `${field} must be a finite number (got ${JSON.stringify(v)})`,
        });
        continue;
      }
      if (v < 0) {
        errors.push({
          location: `${root}.${field}`,
          kind: "out_of_bounds",
          detail: `${field} must be >= 0 (got ${v})`,
        });
      }
      if (v > MAX_VOLUME) {
        errors.push({
          location: `${root}.${field}`,
          kind: "out_of_bounds",
          detail: `${field} exceeds sanity bound ${MAX_VOLUME} m³ (got ${v}) — likely a unit error`,
        });
      }
    }

    // P2-V11: actualConsumption requires consumptionReportingYear.
    if (
      a.actualConsumption_m3_per_year !== null &&
      a.actualConsumption_m3_per_year !== undefined &&
      (a.consumptionReportingYear === null || a.consumptionReportingYear === undefined)
    ) {
      errors.push({
        location: `${root}.consumptionReportingYear`,
        kind: "state_invariant_violation",
        detail:
          "consumptionReportingYear must be set when actualConsumption_m3_per_year is populated",
      });
    }
  }

  // Water-use indicators -----------------------------------------------------
  for (const w of input.waterUseIndicators) {
    const root = `waterUseIndicators[${w.slug}]`;
    if (!projectSlugs.has(w.projectSlug)) {
      errors.push({
        location: `${root}.projectSlug`,
        kind: "missing_project_ref",
        detail: `unknown project slug "${w.projectSlug}"`,
      });
    }
    if (!w.sourceRecordSlugs?.length) {
      errors.push({
        location: `${root}.sourceRecordSlugs`,
        kind: "claim_without_source",
        detail: "water-use indicator must cite at least one source record",
      });
    }
    for (const [i, s] of (w.sourceRecordSlugs ?? []).entries()) {
      if (!sourceSlugs.has(s)) {
        errors.push({
          location: `${root}.sourceRecordSlugs[${i}]`,
          kind: "missing_source_ref",
          detail: `unknown source record slug "${s}"`,
        });
      }
    }
    for (const [i, s] of (w.computedFromAuthorizationSlugs ?? []).entries()) {
      if (!authorizationSlugs.has(s)) {
        errors.push({
          location: `${root}.computedFromAuthorizationSlugs[${i}]`,
          kind: "missing_authorization_ref",
          detail: `unknown authorization slug "${s}"`,
        });
      }
    }

    // P2-V8: non-placeholder WUI must reference at least one authorization.
    if (w.ingestionState !== "placeholder") {
      const refs = Array.isArray(w.computedFromAuthorizationSlugs)
        ? w.computedFromAuthorizationSlugs
        : [];
      if (refs.length === 0) {
        errors.push({
          location: `${root}.computedFromAuthorizationSlugs`,
          kind: "state_invariant_violation",
          detail: "non-placeholder WaterUseIndicator must reference at least one authorization",
        });
      }
    }
  }

  // Ingestion status ---------------------------------------------------------
  for (const s of input.ingestionStatus) {
    const root = `ingestionStatus[${s.slug}]`;
    if (!projectSlugs.has(s.projectSlug)) {
      errors.push({
        location: `${root}.projectSlug`,
        kind: "missing_project_ref",
        detail: `unknown project slug "${s.projectSlug}"`,
      });
    }
  }

  // Bundle-level Phase 2 rules ----------------------------------------------

  // P2-V12: disclaimer present at bundle root.
  if (
    !input.disclaimer ||
    typeof input.disclaimer !== "string" ||
    input.disclaimer.trim().length === 0
  ) {
    errors.push({
      location: "bundle.disclaimer",
      kind: "missing_required_field",
      detail: "bundle must carry a non-empty disclaimer",
    });
  }

  // P2-V13: when phase === 2, version must start with "0.2.0-phase2".
  if (input.phase === 2 && (!input.version || !String(input.version).startsWith("0.2.0-phase2"))) {
    errors.push({
      location: "bundle.version",
      kind: "state_invariant_violation",
      detail: `bundle.phase === 2 requires version to start with "0.2.0-phase2" (got "${input.version}")`,
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    inspected: {
      projects: input.projects.length,
      authorizations: input.authorizations.length,
      sourceRecords: input.sourceRecords.length,
      waterUseIndicators: input.waterUseIndicators.length,
      ingestionStatus: input.ingestionStatus.length,
    },
  };
}

function checkUnique<T extends { slug: string }>(
  items: T[],
  collection: string,
  errors: NrtaValidationError[],
): void {
  const seen = new Set<string>();
  items.forEach((item, idx) => {
    if (!item.slug) {
      errors.push({
        location: `${collection}[${idx}]`,
        kind: "missing_required_field",
        detail: "slug",
      });
      return;
    }
    if (seen.has(item.slug)) {
      errors.push({
        location: `${collection}[${idx}]`,
        kind: "duplicate_slug",
        detail: item.slug,
      });
    }
    seen.add(item.slug);
  });
}
