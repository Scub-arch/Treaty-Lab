// DATA-001 — derive the Postgres schema from the canonical SQLite schema.
//
// The dual-target strategy keeps `prisma/schema.prisma` (provider = sqlite) as
// the single source of truth for local dev + CI. Production runs on Postgres;
// this script generates `prisma/schema.postgres.prisma` by swapping only the
// datasource provider. Because the models avoid Prisma enums and scalar-list
// arrays (value arrays are `Json`, cross-refs are relations), the exact same
// model blocks compile on both targets — so there is nothing else to change.
//
// Run: node scripts/gen-postgres-schema.mjs
// CI/prod migrations: prisma migrate deploy --schema prisma/schema.postgres.prisma

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const SRC = join(root, "prisma", "schema.prisma");
const OUT = join(root, "prisma", "schema.postgres.prisma");

const sqlite = readFileSync(SRC, "utf8");

if (!/provider\s*=\s*"sqlite"/.test(sqlite)) {
  throw new Error('gen-postgres-schema: expected `provider = "sqlite"` in prisma/schema.prisma');
}

const banner =
  "// GENERATED FILE — do not edit by hand.\n" +
  "// Postgres (prod) target, derived from prisma/schema.prisma by\n" +
  "// scripts/gen-postgres-schema.mjs (DATA-001). Edit the SQLite schema instead.\n\n";

const postgres = banner + sqlite.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');

writeFileSync(OUT, postgres);
console.log(
  "Wrote prisma/schema.postgres.prisma (provider = postgresql) from prisma/schema.prisma",
);
