// Prisma client singleton with a driver adapter selected by the DATABASE_URL
// scheme:
//   file:                 → @prisma/adapter-better-sqlite3   (local dev + CI)
//   postgres:// postgresql:// → @prisma/adapter-pg            (production)
//
// The singleton avoids exhausting the connection pool across Next.js dev's
// hot-reload. Adapters are DYNAMICALLY imported so only the one for the active
// database is loaded: better-sqlite3's native binding is not traced into the
// standalone server build (DPL-001), and production runs Postgres — statically
// importing the SQLite adapter there would crash at module load.

import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
const isPostgres = databaseUrl.startsWith("postgres://") || databaseUrl.startsWith("postgresql://");

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

async function createClient(): Promise<PrismaClient> {
  const log: ("warn" | "error")[] =
    process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];

  if (isPostgres) {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    return new PrismaClient({ adapter: new PrismaPg(databaseUrl), log });
  }

  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  const dbPath = databaseUrl.startsWith("file:") ? databaseUrl.slice(5) : databaseUrl;
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: dbPath }), log });
}

export const prisma = globalForPrisma.prisma ?? (await createClient());

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
