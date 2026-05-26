// Prisma client singleton — avoids exhausting the connection pool during
// Next.js dev's hot-reload, where modules are repeatedly re-evaluated.
//
// Prisma 7's new `prisma-client` generator requires a driver adapter
// (or Accelerate). For local SQLite we use @prisma/adapter-better-sqlite3.

import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
// Adapter expects a filesystem path; strip the "file:" prefix if present.
const dbPath = databaseUrl.startsWith("file:") ? databaseUrl.slice(5) : databaseUrl;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
