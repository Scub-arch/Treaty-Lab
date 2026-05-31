# syntax=docker/dockerfile:1
#
# DPL-001 — multi-stage build of the Next 16 standalone server.
#
# NOTE (unverified in the authoring sandbox — no Docker daemon): this targets the
# PRODUCTION Postgres path. Two prerequisites before this image actually runs, both
# tracked in docs/DEPLOY.md → "Containerization":
#   1. src/lib/db.ts must select the Postgres adapter for postgres:// URLs (it
#      currently hardcodes @prisma/adapter-better-sqlite3 — whose native binding is
#      NOT traced into .next/standalone).
#   2. Runtime DATABASE_URL must point at Postgres; migrations run via the
#      platform release command (see fly.toml).
# The build stage uses a throwaway SQLite DB purely so generateStaticParams() can
# prerender at build time — it never ships in the runtime image.

# ---- deps ----------------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ---------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generated Prisma client (gitignored) + Next 16 route types.
RUN npx prisma generate
# generateStaticParams()/pages query the DB at build → give the build a throwaway
# SQLite DB so it can prerender. Runtime overrides DATABASE_URL with Postgres.
ENV DATABASE_URL="file:./prisma/build.db"
RUN npx prisma migrate deploy && npx prisma db seed
RUN npx next typegen && npm run build

# ---- runtime -------------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Next standalone server + its static assets + public/.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Prisma schema + migrations (+ CLI deps) so the platform release command can run
# `prisma migrate deploy` against the production database.
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000
CMD ["node", "server.js"]
