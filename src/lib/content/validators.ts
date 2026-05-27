/**
 * Content cross-reference validators.
 *
 * The Treaty-Lab content store uses slug strings as foreign keys across files
 * (projects.json → evidence.json, modules.json → indicators.json, etc.) — these
 * references are NOT enforced at write time because the JSON files are
 * hand-authored. This module validates them at read / build time so dangling
 * references surface as errors rather than silently rendering as missing UI.
 *
 * Used by:
 *   - `scripts/check-content.mjs` (CI gate via `npm run check:content`)
 *   - dev-mode warning hooks (optional — call `validateContent()` from a
 *     dev-only effect to surface drift while editing JSON)
 */

import {
  getEvidence,
  getIndicators,
  getProjects,
  getExplainers,
  getModules,
} from "@/lib/content";
import type { Claim, ProjectAssessment } from "@/lib/content/types";

export type ValidationCollection =
  | "evidence"
  | "indicator"
  | "project"
  | "explainer"
  | "module";

export interface ValidationError {
  /** Human-readable location of the broken reference, e.g. `projects[cedar-lng].firstNationImplications[2].sources[0]` */
  location: string;
  /** The slug that didn't resolve, or the duplicated slug, or the missing field */
  badValue: string;
  /** The collection the slug was expected to resolve into */
  expectedCollection: ValidationCollection;
  /** Class of error */
  kind: "missing_reference" | "duplicate_slug" | "missing_required_field";
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
  /** Counts of records inspected per collection — useful for the report */
  inspected: Record<ValidationCollection, number>;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Walk every cross-reference in the content store and return a structured
 * report. `ok === true` only if every reference resolves and every slug is
 * unique within its collection.
 */
export function validateContent(): ValidationResult {
  const errors: ValidationError[] = [];

  const projects = getProjects();
  const evidence = getEvidence();
  const indicators = getIndicators();
  const explainers = getExplainers();
  const modules = getModules();

  // Build slug lookup sets once
  const evidenceSlugs = new Set(evidence.map((e) => e.slug));
  const indicatorSlugs = new Set(indicators.map((i) => i.slug));
  const projectSlugs = new Set(projects.map((p) => p.slug));

  // --- Slug uniqueness checks -----------------------------------------------
  errors.push(...checkUniqueSlugs(projects, "project"));
  errors.push(...checkUniqueSlugs(evidence, "evidence"));
  errors.push(...checkUniqueSlugs(indicators, "indicator"));
  errors.push(...checkUniqueSlugs(explainers, "explainer"));
  errors.push(...checkUniqueSlugs(modules, "module"));

  // --- Project cross-references ---------------------------------------------
  for (const project of projects) {
    const root = `projects[${project.slug}]`;

    // primarySources[].evidenceSlug
    project.primarySources.forEach((ref, i) => {
      if (!evidenceSlugs.has(ref.evidenceSlug)) {
        errors.push(missingRef(`${root}.primarySources[${i}]`, ref.evidenceSlug, "evidence"));
      }
    });

    // firstNationImplications / treatyAndWaterRisk / financeRisk claim arrays
    errors.push(...checkClaimSources(project.firstNationImplications, `${root}.firstNationImplications`, evidenceSlugs));
    errors.push(...checkClaimSources(project.treatyAndWaterRisk, `${root}.treatyAndWaterRisk`, evidenceSlugs));
    errors.push(...checkClaimSources(project.financeRisk, `${root}.financeRisk`, evidenceSlugs));

    // finance.sources[]
    if (project.finance.sources) {
      project.finance.sources.forEach((ref, i) => {
        if (!evidenceSlugs.has(ref.evidenceSlug)) {
          errors.push(missingRef(`${root}.finance.sources[${i}]`, ref.evidenceSlug, "evidence"));
        }
      });
    }
  }

  // --- Indicator cross-references -------------------------------------------
  for (const indicator of indicators) {
    if (!indicator.sources) continue;
    indicator.sources.forEach((ref, i) => {
      if (!evidenceSlugs.has(ref.evidenceSlug)) {
        errors.push(
          missingRef(`indicators[${indicator.slug}].sources[${i}]`, ref.evidenceSlug, "evidence"),
        );
      }
    });
  }

  // --- Explainer cross-references -------------------------------------------
  for (const explainer of explainers) {
    if (explainer.relatedEvidence) {
      explainer.relatedEvidence.forEach((slug, i) => {
        if (!evidenceSlugs.has(slug)) {
          errors.push(missingRef(`explainers[${explainer.slug}].relatedEvidence[${i}]`, slug, "evidence"));
        }
      });
    }
    if (explainer.relatedProjects) {
      explainer.relatedProjects.forEach((slug, i) => {
        if (!projectSlugs.has(slug)) {
          errors.push(missingRef(`explainers[${explainer.slug}].relatedProjects[${i}]`, slug, "project"));
        }
      });
    }
  }

  // --- Module cross-references ----------------------------------------------
  for (const module of modules) {
    module.featuredIndicatorSlugs.forEach((slug, i) => {
      if (!indicatorSlugs.has(slug)) {
        errors.push(missingRef(`modules[${module.slug}].featuredIndicatorSlugs[${i}]`, slug, "indicator"));
      }
    });
    module.featuredProjectSlugs.forEach((slug, i) => {
      if (!projectSlugs.has(slug)) {
        errors.push(missingRef(`modules[${module.slug}].featuredProjectSlugs[${i}]`, slug, "project"));
      }
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    inspected: {
      project: projects.length,
      evidence: evidence.length,
      indicator: indicators.length,
      explainer: explainers.length,
      module: modules.length,
    },
  };
}

/**
 * Strict variant of the existing `resolveIndicators` that throws on any
 * missing slug rather than silently filtering. Use in places where you've
 * already validated content and want a hard guarantee at runtime.
 */
export function assertSlugsPresent(
  slugs: string[],
  available: Set<string>,
  collection: ValidationCollection,
  location: string,
): void {
  const missing = slugs.filter((s) => !available.has(s));
  if (missing.length > 0) {
    throw new Error(
      `Content reference error at ${location}: ${missing.length} missing ${collection} slug(s): ${missing.join(", ")}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function checkUniqueSlugs<T extends { slug: string }>(
  items: T[],
  collection: ValidationCollection,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const seen = new Set<string>();
  items.forEach((item, idx) => {
    if (seen.has(item.slug)) {
      errors.push({
        location: `${collection}s[${idx}]`,
        badValue: item.slug,
        expectedCollection: collection,
        kind: "duplicate_slug",
      });
    }
    seen.add(item.slug);
  });
  return errors;
}

function checkClaimSources(
  claims: Claim[],
  root: string,
  evidenceSlugs: Set<string>,
): ValidationError[] {
  const errors: ValidationError[] = [];
  claims.forEach((claim, ci) => {
    if (!claim.sources) return;
    claim.sources.forEach((ref, si) => {
      if (!evidenceSlugs.has(ref.evidenceSlug)) {
        errors.push(missingRef(`${root}[${ci}].sources[${si}]`, ref.evidenceSlug, "evidence"));
      }
    });
  });
  return errors;
}

function missingRef(
  location: string,
  badValue: string,
  expectedCollection: ValidationCollection,
): ValidationError {
  return {
    location,
    badValue,
    expectedCollection,
    kind: "missing_reference",
  };
}

// ---------------------------------------------------------------------------
// Convenience: format errors as a human-readable report
// ---------------------------------------------------------------------------

export function formatValidationReport(result: ValidationResult): string {
  const lines: string[] = [];
  lines.push(
    `Inspected: ${result.inspected.project} projects, ${result.inspected.evidence} evidence items, ${result.inspected.indicator} indicators, ${result.inspected.explainer} explainers, ${result.inspected.module} modules.`,
  );
  if (result.ok) {
    lines.push("All cross-references resolve. Content is clean.");
    return lines.join("\n");
  }
  lines.push(`${result.errors.length} error(s) found:\n`);
  for (const e of result.errors) {
    if (e.kind === "missing_reference") {
      lines.push(`  - ${e.location} → unknown ${e.expectedCollection} slug "${e.badValue}"`);
    } else if (e.kind === "duplicate_slug") {
      lines.push(`  - ${e.location} → duplicate ${e.expectedCollection} slug "${e.badValue}"`);
    } else {
      lines.push(`  - ${e.location} → missing required field "${e.badValue}"`);
    }
  }
  return lines.join("\n");
}

// Re-export the project type for downstream typed consumers
export type { ProjectAssessment };
