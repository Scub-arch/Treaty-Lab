#!/usr/bin/env node
/**
 * NRTA Phase 1 content validator.
 *
 * Walks `src/content/nrta-authorizations.json` and verifies:
 *   - every slug is unique within its collection
 *   - every project, authorization, and water-use indicator cites at least
 *     one SourceRecord that resolves
 *   - every authorization references a known project
 *   - every water-use indicator references known authorizations and project
 *   - every ingestion-status row references a known project
 *
 * Mirrors `src/lib/nrta/data.ts::validateNrtaBundle` but is intentionally
 * self-contained so it can run from a vanilla `node` install in CI without
 * a TypeScript transpile step — same convention as `check-content.mjs`.
 *
 * Usage:
 *   node scripts/check-nrta.mjs        # full check, prints report
 *   node scripts/check-nrta.mjs --json # machine-readable output
 *
 * Exit codes:
 *   0  All checks pass
 *   1  One or more validation errors
 *   2  IO / parse error
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

const bundle = loadJson("src/content/nrta-authorizations.json");

const sourceRecords = bundle.sourceRecords ?? [];
const projects = bundle.projects ?? [];
const authorizations = bundle.authorizations ?? [];
const waterUseIndicators = bundle.waterUseIndicators ?? [];
const ingestionStatus = bundle.ingestionStatus ?? [];

const sourceSlugs = new Set(sourceRecords.map((s) => s.slug));
const projectSlugs = new Set(projects.map((p) => p.slug));
const authorizationSlugs = new Set(authorizations.map((a) => a.slug));

const errors = [];

function err(location, kind, detail) {
  errors.push({ location, kind, detail });
}

function checkUnique(items, collection) {
  const seen = new Set();
  items.forEach((item, idx) => {
    if (!item.slug) {
      err(`${collection}[${idx}]`, "missing_required_field", "slug");
      return;
    }
    if (seen.has(item.slug)) {
      err(`${collection}[${idx}]`, "duplicate_slug", item.slug);
    }
    seen.add(item.slug);
  });
}

checkUnique(sourceRecords, "sourceRecords");
checkUnique(projects, "projects");
checkUnique(authorizations, "authorizations");
checkUnique(waterUseIndicators, "waterUseIndicators");
checkUnique(ingestionStatus, "ingestionStatus");

function requireSources(root, slugs) {
  if (!Array.isArray(slugs) || slugs.length === 0) {
    err(`${root}.sourceRecordSlugs`, "claim_without_source", "at least one source record required");
    return;
  }
  slugs.forEach((s, i) => {
    if (!sourceSlugs.has(s)) {
      err(
        `${root}.sourceRecordSlugs[${i}]`,
        "missing_source_ref",
        `unknown source record slug "${s}"`,
      );
    }
  });
}

for (const p of projects) {
  const root = `projects[${p.slug}]`;
  requireSources(root, p.sourceRecordSlugs);
}

for (const a of authorizations) {
  const root = `authorizations[${a.slug}]`;
  if (!projectSlugs.has(a.projectSlug)) {
    err(`${root}.projectSlug`, "missing_project_ref", `unknown project slug "${a.projectSlug}"`);
  }
  requireSources(root, a.sourceRecordSlugs);
  if (a.ingestionState === "placeholder" && a.allocatedVolume_m3_per_year !== null) {
    err(
      `${root}.allocatedVolume_m3_per_year`,
      "missing_required_field",
      "placeholder rows must keep allocatedVolume_m3_per_year as null until verified",
    );
  }
}

for (const w of waterUseIndicators) {
  const root = `waterUseIndicators[${w.slug}]`;
  if (!projectSlugs.has(w.projectSlug)) {
    err(`${root}.projectSlug`, "missing_project_ref", `unknown project slug "${w.projectSlug}"`);
  }
  requireSources(root, w.sourceRecordSlugs);
  (w.computedFromAuthorizationSlugs ?? []).forEach((s, i) => {
    if (!authorizationSlugs.has(s)) {
      err(
        `${root}.computedFromAuthorizationSlugs[${i}]`,
        "missing_authorization_ref",
        `unknown authorization slug "${s}"`,
      );
    }
  });
}

for (const s of ingestionStatus) {
  const root = `ingestionStatus[${s.slug}]`;
  if (!projectSlugs.has(s.projectSlug)) {
    err(`${root}.projectSlug`, "missing_project_ref", `unknown project slug "${s.projectSlug}"`);
  }
}

const inspected = {
  sourceRecords: sourceRecords.length,
  projects: projects.length,
  authorizations: authorizations.length,
  waterUseIndicators: waterUseIndicators.length,
  ingestionStatus: ingestionStatus.length,
};

if (wantJson) {
  console.log(JSON.stringify({ ok: errors.length === 0, inspected, errors }, null, 2));
} else {
  console.log(
    `NRTA bundle: ${inspected.sourceRecords} source records, ${inspected.projects} projects, ${inspected.authorizations} authorizations, ${inspected.waterUseIndicators} indicators, ${inspected.ingestionStatus} status rows.`,
  );
  if (errors.length === 0) {
    console.log("OK: NRTA Phase 1 bundle validates.");
  } else {
    console.error(`FAIL: ${errors.length} NRTA validation error(s):\n`);
    for (const e of errors) {
      console.error(`  - ${e.location} [${e.kind}] ${e.detail}`);
    }
  }
}

process.exit(errors.length === 0 ? 0 : 1);
