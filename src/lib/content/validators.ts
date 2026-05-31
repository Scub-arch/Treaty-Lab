/**
 * Content cross-reference validators (runtime/getter-bound entrypoint).
 *
 * The Treaty-Lab content store uses slug strings as foreign keys across files
 * (projects.json → evidence.json, modules.json → indicators.json, etc.). These
 * references are NOT enforced at write time because the JSON files are
 * hand-authored. This module validates them at read / build time so dangling
 * references surface as errors rather than silently rendering as missing UI.
 *
 * The actual rules live in `./validate-data` as a pure, data-in function so the
 * same logic can run in contexts without the `@/` path alias (the Prisma seed).
 * This file binds that function to the runtime content getters and re-exports
 * the rest, keeping the existing `@/lib/content/validators` API stable.
 *
 * Used by:
 *   - `src/lib/content.ts` (re-exported into the public content API)
 *   - `scripts/check-content.mjs` mirrors the rules in a self-contained `.mjs`
 *     so the CI gate (`npm run check:content`) runs without a transpile step.
 */

import { getEvidence, getIndicators, getProjects, getExplainers, getModules } from "@/lib/content";
import { validateContentData, type ValidationResult } from "@/lib/content/validate-data";
import type { ProjectAssessment } from "@/lib/content/types";

/**
 * Validate the live content store (read via the content getters). Thin wrapper
 * over `validateContentData` — see `./validate-data` for the rules.
 */
export function validateContent(): ValidationResult {
  return validateContentData({
    projects: getProjects(),
    evidence: getEvidence(),
    indicators: getIndicators(),
    explainers: getExplainers(),
    modules: getModules(),
  });
}

// Re-export the pure validator surface so existing importers of
// `@/lib/content/validators` keep working unchanged.
export {
  validateContentData,
  assertSlugsPresent,
  formatValidationReport,
} from "@/lib/content/validate-data";
export type {
  ContentCollections,
  ValidationCollection,
  ValidationError,
  ValidationResult,
} from "@/lib/content/validate-data";

// Re-export the project type for downstream typed consumers
export type { ProjectAssessment };
