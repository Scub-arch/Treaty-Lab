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

// Build a lookup so V14 can check the project's IngestionStatus.dataSovereigntyNote.
const ingestionByProject = new Map();
for (const s of ingestionStatus) {
  ingestionByProject.set(s.projectSlug, s);
}

// Helper: a row has volume data iff allocatedVolume_m3_per_year or oneTimeVolume_m3 is non-null.
function hasVolumeData(a) {
  return (
    (a.allocatedVolume_m3_per_year !== null && a.allocatedVolume_m3_per_year !== undefined) ||
    (a.oneTimeVolume_m3 !== null && a.oneTimeVolume_m3 !== undefined)
  );
}

// Helper: V6 — at least one cited source has BOTH url AND accessedAt populated.
function hasQualifiedSource(a) {
  return (a.sourceRecordSlugs ?? []).some((slug) => {
    const s = sourceRecords.find((r) => r.slug === slug);
    return s && s.url && s.accessedAt;
  });
}

// Helper: bounds check for any volume field.
const MAX_VOLUME = 1e10; // ~31,700 m³/s — implausible for a single licence; sanity bound.

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

  // ---- Phase 2 rules ----

  // P2-V1: needs_verification rows must have volume data (allocated OR one-time).
  if (a.ingestionState === "needs_verification" && !hasVolumeData(a)) {
    err(
      `${root}.allocatedVolume_m3_per_year`,
      "state_invariant_violation",
      "needs_verification row must have non-null allocatedVolume_m3_per_year or oneTimeVolume_m3",
    );
  }

  // P2-V2 / V3 / V4 / V5: verified rows require a populated identity + volume + dates + watershed.
  if (a.ingestionState === "verified") {
    if (!a.authorizationNumber) {
      err(
        `${root}.authorizationNumber`,
        "state_invariant_violation",
        "verified row must have a non-null authorizationNumber",
      );
    }
    if (!hasVolumeData(a)) {
      err(
        `${root}.allocatedVolume_m3_per_year`,
        "state_invariant_violation",
        "verified row must have non-null allocatedVolume_m3_per_year or oneTimeVolume_m3",
      );
    }
    if (!a.firstLicensedAt) {
      err(
        `${root}.firstLicensedAt`,
        "state_invariant_violation",
        "verified row must have firstLicensedAt set",
      );
    }
    if (!a.sourceWatershed) {
      err(
        `${root}.sourceWatershed`,
        "state_invariant_violation",
        "verified row must have sourceWatershed set",
      );
    }

    // P2-V6: at least one cited SourceRecord has BOTH url AND accessedAt.
    if (!hasQualifiedSource(a)) {
      err(
        `${root}.sourceRecordSlugs`,
        "state_invariant_violation",
        "verified row must cite at least one SourceRecord with both url and accessedAt set",
      );
    }
  }

  // P2-V7: non-placeholder rows must NOT carry placeholderFields entries.
  if (
    a.ingestionState !== "placeholder" &&
    Array.isArray(a.placeholderFields) &&
    a.placeholderFields.length > 0
  ) {
    err(
      `${root}.placeholderFields`,
      "state_invariant_violation",
      `non-placeholder row must have empty placeholderFields (found: ${a.placeholderFields.join(", ")})`,
    );
  }

  // P2-V9 / V10: numeric bounds on any populated volume field.
  for (const field of [
    "allocatedVolume_m3_per_year",
    "oneTimeVolume_m3",
    "actualConsumption_m3_per_year",
  ]) {
    const v = a[field];
    if (v === null || v === undefined) continue;
    if (typeof v !== "number" || Number.isNaN(v)) {
      err(
        `${root}.${field}`,
        "out_of_bounds",
        `${field} must be a finite number (got ${JSON.stringify(v)})`,
      );
      continue;
    }
    if (v < 0) {
      err(`${root}.${field}`, "out_of_bounds", `${field} must be >= 0 (got ${v})`);
    }
    if (v > MAX_VOLUME) {
      err(
        `${root}.${field}`,
        "out_of_bounds",
        `${field} exceeds sanity bound ${MAX_VOLUME} m³ (got ${v}) — likely a unit error`,
      );
    }
  }

  // P2-V11: actualConsumption requires consumptionReportingYear.
  if (
    a.actualConsumption_m3_per_year !== null &&
    a.actualConsumption_m3_per_year !== undefined &&
    (a.consumptionReportingYear === null || a.consumptionReportingYear === undefined)
  ) {
    err(
      `${root}.consumptionReportingYear`,
      "state_invariant_violation",
      "consumptionReportingYear must be set when actualConsumption_m3_per_year is populated",
    );
  }

  // P2-V14: if the project's IngestionStatus has dataSovereigntyNote, rows cannot be verified.
  if (a.ingestionState === "verified") {
    const status = ingestionByProject.get(a.projectSlug);
    if (status && status.dataSovereigntyNote) {
      err(
        `${root}.ingestionState`,
        "state_invariant_violation",
        `cannot be verified while project's IngestionStatus has dataSovereigntyNote — Indigenous-data-sovereignty gate`,
      );
    }
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

  // P2-V8: WUI with non-placeholder state must have non-empty computedFromAuthorizationSlugs.
  if (w.ingestionState !== "placeholder") {
    const refs = Array.isArray(w.computedFromAuthorizationSlugs)
      ? w.computedFromAuthorizationSlugs
      : [];
    if (refs.length === 0) {
      err(
        `${root}.computedFromAuthorizationSlugs`,
        "state_invariant_violation",
        "non-placeholder WaterUseIndicator must reference at least one authorization",
      );
    }
  }
}

// ---- Phase 2 bundle-level rules ----

// P2-V12: disclaimer present at bundle root.
if (
  !bundle.disclaimer ||
  typeof bundle.disclaimer !== "string" ||
  bundle.disclaimer.trim().length === 0
) {
  err("bundle.disclaimer", "missing_required_field", "bundle must carry a non-empty disclaimer");
}

// P2-V13: when phase === 2, version must start with "0.2.0-phase2".
if (bundle.phase === 2 && (!bundle.version || !String(bundle.version).startsWith("0.2.0-phase2"))) {
  err(
    "bundle.version",
    "state_invariant_violation",
    `bundle.phase === 2 requires version to start with "0.2.0-phase2" (got "${bundle.version}")`,
  );
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
