#!/usr/bin/env node
/**
 * Content cross-reference checker for Treaty-Lab.
 *
 * Reads src/content/*.json directly via fs (no TypeScript transpile required —
 * keeps the CI gate dependency-free), validates slug uniqueness and every
 * cross-reference, and exits with a non-zero status on any failure.
 *
 * Mirrors the logic in `src/lib/content/validators.ts` but is intentionally
 * self-contained so it can run from a vanilla `node` install in CI.
 *
 * Usage:
 *   node scripts/check-content.mjs        # full check, prints report
 *   node scripts/check-content.mjs --json # machine-readable output
 *
 * Exit codes:
 *   0  All references resolve, all slugs unique
 *   1  One or more validation errors
 *   2  IO / parse error (couldn't read or parse a content file)
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");

const wantJson = process.argv.includes("--json");

function loadJson(relPath) {
  try {
    const full = resolve(ROOT, relPath);
    return JSON.parse(readFileSync(full, "utf8"));
  } catch (err) {
    console.error(`FATAL: could not read ${relPath}: ${err.message}`);
    process.exit(2);
  }
}

const projects = loadJson("src/content/projects.json").projects ?? [];
const evidence = loadJson("src/content/evidence.json").items ?? [];
const indicators = loadJson("src/content/indicators.json").indicators ?? [];
const explainers = loadJson("src/content/explainers.json").explainers ?? [];
const modules = loadJson("src/content/modules.json").modules ?? [];

const evidenceSlugs = new Set(evidence.map((e) => e.slug));
const indicatorSlugs = new Set(indicators.map((i) => i.slug));
const projectSlugs = new Set(projects.map((p) => p.slug));

const errors = [];

function err(location, badValue, expectedCollection, kind = "missing_reference") {
  errors.push({ location, badValue, expectedCollection, kind });
}

// --- Slug uniqueness -------------------------------------------------------

function checkUnique(items, collection) {
  const seen = new Set();
  items.forEach((item, idx) => {
    if (!item.slug) {
      err(`${collection}s[${idx}]`, "<missing slug>", collection, "missing_required_field");
      return;
    }
    if (seen.has(item.slug)) {
      err(`${collection}s[${idx}]`, item.slug, collection, "duplicate_slug");
    }
    seen.add(item.slug);
  });
}

checkUnique(projects, "project");
checkUnique(evidence, "evidence");
checkUnique(indicators, "indicator");
checkUnique(explainers, "explainer");
checkUnique(modules, "module");

// --- Project cross-references ----------------------------------------------

for (const project of projects) {
  const root = `projects[${project.slug}]`;

  for (const [i, ref] of (project.primarySources ?? []).entries()) {
    if (!evidenceSlugs.has(ref.evidenceSlug)) {
      err(`${root}.primarySources[${i}]`, ref.evidenceSlug, "evidence");
    }
  }

  for (const claimArrayName of ["firstNationImplications", "treatyAndWaterRisk", "financeRisk"]) {
    for (const [ci, claim] of (project[claimArrayName] ?? []).entries()) {
      for (const [si, ref] of (claim.sources ?? []).entries()) {
        if (!evidenceSlugs.has(ref.evidenceSlug)) {
          err(`${root}.${claimArrayName}[${ci}].sources[${si}]`, ref.evidenceSlug, "evidence");
        }
      }
    }
  }

  for (const [i, ref] of (project.finance?.sources ?? []).entries()) {
    if (!evidenceSlugs.has(ref.evidenceSlug)) {
      err(`${root}.finance.sources[${i}]`, ref.evidenceSlug, "evidence");
    }
  }
}

// --- Indicator cross-references --------------------------------------------

for (const indicator of indicators) {
  for (const [i, ref] of (indicator.sources ?? []).entries()) {
    if (!evidenceSlugs.has(ref.evidenceSlug)) {
      err(`indicators[${indicator.slug}].sources[${i}]`, ref.evidenceSlug, "evidence");
    }
  }
}

// --- Explainer cross-references --------------------------------------------

for (const explainer of explainers) {
  for (const [i, slug] of (explainer.relatedEvidence ?? []).entries()) {
    if (!evidenceSlugs.has(slug)) {
      err(`explainers[${explainer.slug}].relatedEvidence[${i}]`, slug, "evidence");
    }
  }
  for (const [i, slug] of (explainer.relatedProjects ?? []).entries()) {
    if (!projectSlugs.has(slug)) {
      err(`explainers[${explainer.slug}].relatedProjects[${i}]`, slug, "project");
    }
  }
}

// --- Module cross-references -----------------------------------------------

for (const m of modules) {
  for (const [i, slug] of (m.featuredIndicatorSlugs ?? []).entries()) {
    if (!indicatorSlugs.has(slug)) {
      err(`modules[${m.slug}].featuredIndicatorSlugs[${i}]`, slug, "indicator");
    }
  }
  for (const [i, slug] of (m.featuredProjectSlugs ?? []).entries()) {
    if (!projectSlugs.has(slug)) {
      err(`modules[${m.slug}].featuredProjectSlugs[${i}]`, slug, "project");
    }
  }
}

// --- Report ----------------------------------------------------------------

const inspected = {
  project: projects.length,
  evidence: evidence.length,
  indicator: indicators.length,
  explainer: explainers.length,
  module: modules.length,
};

if (wantJson) {
  console.log(JSON.stringify({ ok: errors.length === 0, inspected, errors }, null, 2));
} else {
  console.log(
    `Inspected: ${inspected.project} projects, ${inspected.evidence} evidence items, ${inspected.indicator} indicators, ${inspected.explainer} explainers, ${inspected.module} modules.`,
  );
  if (errors.length === 0) {
    console.log("OK: all cross-references resolve. Content is clean.");
  } else {
    console.error(`FAIL: ${errors.length} validation error(s):\n`);
    for (const e of errors) {
      if (e.kind === "missing_reference") {
        console.error(`  - ${e.location} -> unknown ${e.expectedCollection} slug "${e.badValue}"`);
      } else if (e.kind === "duplicate_slug") {
        console.error(
          `  - ${e.location} -> duplicate ${e.expectedCollection} slug "${e.badValue}"`,
        );
      } else {
        console.error(`  - ${e.location} -> ${e.kind}: "${e.badValue}"`);
      }
    }
  }
}

process.exit(errors.length === 0 ? 0 : 1);
