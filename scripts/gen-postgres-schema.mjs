#!/usr/bin/env node
/**
 * Generate prisma/schema.postgres.prisma from the canonical
 * prisma/schema.prisma (DATA-001, Q-B).
 *
 * The SQLite schema is the single source of truth. The content models were
 * deliberately written to compile on both targets (no Prisma enums, no
 * scalar-list `String[]` — value arrays are `Json`, cross-references are
 * relations), so the ONLY difference between the two schemas is the datasource
 * provider. This script swaps that one line and writes a generated, do-not-edit
 * copy, eliminating hand-maintained drift between the two files.
 *
 * Usage:
 *   node scripts/gen-postgres-schema.mjs          # write the file
 *   node scripts/gen-postgres-schema.mjs --check  # verify it is up to date (CI)
 *
 * Verify the output:
 *   npx prisma validate --schema prisma/schema.postgres.prisma
 *
 * Exit codes:
 *   0  wrote the file (or --check passed)
 *   1  --check failed (file missing or stale) — run without --check to fix
 *   2  unexpected source schema (provider line not found exactly once)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SOURCE = resolve(ROOT, "prisma/schema.prisma");
const TARGET = resolve(ROOT, "prisma/schema.postgres.prisma");

const checkOnly = process.argv.includes("--check");

const HEADER = `// ----------------------------------------------------------------------------
// GENERATED FILE — DO NOT EDIT.
// Produced from prisma/schema.prisma by scripts/gen-postgres-schema.mjs.
// Edit the canonical SQLite schema, then re-run \`node scripts/gen-postgres-schema.mjs\`.
// ----------------------------------------------------------------------------

`;

const source = readFileSync(SOURCE, "utf8");

// Swap ONLY the datasource provider. The generator block uses
// provider = "prisma-client", so "sqlite" is unique to the datasource.
const matches = source.match(/provider = "sqlite"/g) ?? [];
if (matches.length !== 1) {
  console.error(
    `FATAL: expected exactly one \`provider = "sqlite"\` in prisma/schema.prisma, found ${matches.length}.`,
  );
  process.exit(2);
}

const generated = HEADER + source.replace('provider = "sqlite"', 'provider = "postgresql"');

// Compare line-ending-agnostically: the source/target working-tree files may be
// CRLF on Windows but LF on Linux/CI (git autocrlf). Drift detection should fire
// on real content changes only, not on checkout line-ending differences.
const normalizeEol = (s) => s.replace(/\r\n/g, "\n");

if (checkOnly) {
  let current = null;
  try {
    current = readFileSync(TARGET, "utf8");
  } catch {
    console.error(
      "FAIL: prisma/schema.postgres.prisma is missing. Run: node scripts/gen-postgres-schema.mjs",
    );
    process.exit(1);
  }
  if (normalizeEol(current) !== normalizeEol(generated)) {
    console.error(
      "FAIL: prisma/schema.postgres.prisma is stale. Run: node scripts/gen-postgres-schema.mjs",
    );
    process.exit(1);
  }
  console.log("OK: prisma/schema.postgres.prisma is up to date.");
  process.exit(0);
}

writeFileSync(TARGET, generated, "utf8");
console.log(
  "Wrote prisma/schema.postgres.prisma from prisma/schema.prisma (provider → postgresql).",
);
