# Deployment

> Covers **auth (SEC-001)**, **Databricks gateway auth (AI-003)**, and
> **containerization + deploy (DPL-001)**. DPL-001's standalone output and
> `/api/healthz` are in place and verified; the Dockerfile / `fly.toml` / deploy
> workflow are authored but **need validation against a real Docker/Fly
> environment** — see "Prerequisites" below.

## Authentication (SEC-001)

Treaty-Lab uses a **hand-rolled, database-backed session with passwordless
magic-link sign-in** — not a third-party auth library. The rationale and full
design are in [`SEC-001-PLAN.md`](SEC-001-PLAN.md); the short version:

- **Why not Auth.js:** Auth.js v5 is beta and its Next.js integration targets the
  now-renamed `middleware`/Edge conventions. Next 16 renamed `middleware` →
  `proxy` (Node.js runtime), and diverges enough from training data that library
  compatibility was unverified. The DIY approach produces the exact models we need
  with zero external-auth-lib risk.
- **Models:** `Org`, `User`, `Account` (OAuth-ready, unused today), `Session`,
  `VerificationToken` (see `prisma/schema.prisma`).
- **Sessions:** 30-day database sessions. The cookie (`tl_session`) holds a random
  token; only its SHA-256 hash is stored, so a DB leak exposes no live sessions.
  The cookie is `httpOnly`, `sameSite=lax`, and `secure` in production.
- **Magic links:** 15-minute, single-use `VerificationToken`s (hashed at rest).
  Issuing a link does not create a user; the `User` + a personal `Org` are
  bootstrapped on first successful sign-in.
- **Route protection:** `src/proxy.ts` (Next 16 proxy, Node runtime) redirects any
  page other than `/`, `/login`, `/api/auth/*`, and static assets to
  `/login?next=…` when the session cookie is absent. `/api/ask` and
  `/api/ask/stream` call `auth()` and return **401** when unauthenticated.

### Environment variables

| Var            | Required        | Notes                                                                          |
| -------------- | --------------- | ------------------------------------------------------------------------------ |
| `DATABASE_URL` | yes             | SQLite (`file:./dev.db`) in dev/CI; Postgres in prod.                          |
| `APP_URL`      | prod (optional) | Base URL for magic-link sign-in URLs. Falls back to the request origin in dev. |

There is **no `AUTH_SECRET`** — sessions are random opaque tokens validated by
database lookup, not signed JWTs, so there is no signing key to manage.

### Email delivery

In dev the magic link is printed to the **server console** and returned in the
`POST /api/auth/signin` response (`devUrl`) for password-less local sign-in. The
sender is pluggable: implement an SMTP/provider `EmailSender` in
[`src/lib/auth/email.ts`](../src/lib/auth/email.ts) (`getEmailSender()`) and wire
it to env vars (`SMTP_URL`, `EMAIL_FROM`, …) for production. The dev response
never exposes `devUrl` when `NODE_ENV=production`.

### Local sign-in walkthrough

1. `npm run dev`, open `/login`, enter any email.
2. The response shows a **dev magic link** (also printed to the console). Click it.
3. You land on your `next` destination, signed in; the TopBar shows your email +
   **Sign out**.

### Admin access (AUDIT-004a)

Admin-only surfaces (e.g. the read-only `/admin/audit` revision log) are gated by
an **email allowlist**, not a persisted role. Set `ADMIN_EMAILS` (comma/space-
separated, case-insensitive) to the operator emails; any signed-in session whose
email is listed is treated as an admin. **Empty or unset ⇒ no admins** (the admin
surface stays closed). A persisted role model is deferred until multi-admin or
content-editor needs arise.

### Production checklist

- [ ] `DATABASE_URL` points at Postgres; run `prisma migrate deploy`.
- [ ] `APP_URL` set to the public origin (so links are not built from an internal host).
- [ ] A real `EmailSender` is wired in `src/lib/auth/email.ts`.
- [ ] Served over HTTPS (the session cookie is `Secure` in production and will not
      round-trip over plain HTTP).
- [ ] Consider tightening route protection if any currently-public page should be
      gated, and vice versa (`PUBLIC_PATHS` in `src/proxy.ts`).
- [ ] Set `ADMIN_EMAILS` for whoever should reach admin surfaces (empty ⇒ no admins).

## Databricks gateway auth (AI-003)

The `/api/ask` endpoints reach the Databricks AI Gateway through `src/lib/llm`.
Token resolution (`getToken`) tries, in order:

1. **Service-principal M2M** — when `DATABRICKS_CLIENT_ID` + `DATABRICKS_CLIENT_SECRET`
   are set, it POSTs client credentials to `<DATABRICKS_HOST>/oidc/v1/token` and
   caches the token in-process under its `expires_in` (minus a 60s safety margin).
   **This is the production path** — no CLI, no PAT.
2. Cached U2M OAuth token (`~/.dbx-token.cache.json`, from `databricks auth login`) — local dev.
3. The `databricks` CLI — local dev only (skipped entirely when `NODE_ENV=production`).
4. `DATABRICKS_TOKEN` PAT — legacy fallback.

### Production setup

1. Create a Databricks **service principal** and an OAuth secret for it; grant it
   access to the gateway serving endpoint.
2. Set `DATABRICKS_CLIENT_ID` + `DATABRICKS_CLIENT_SECRET` (and `DATABRICKS_HOST` if
   the workspace differs from the default) as server env vars / secrets.
3. Deploy. With those set and no cache file / CLI present, `/api/ask` resolves a
   token via M2M on first call and reuses it until expiry.

The in-process M2M cache is per-instance. AI-002 (Upstash Redis) can move it to a
shared key (`dbx:token:<workspace_host>`) so instances share one token.

## Containerization & deploy (DPL-001)

### What is in place

- **`output: "standalone"`** (`next.config.ts`) — `next build` emits
  `.next/standalone/server.js`; the runtime image ships only traced deps.
- **`GET /api/healthz`** — public probe returning `{ status, db, gateway }` (200
  healthy / 503 degraded). Wired to the Fly health check (`fly.toml`).
- **`Dockerfile`** — multi-stage (deps → build → runtime). The build stage uses a
  throwaway SQLite DB so `generateStaticParams()` can prerender; the runtime stage
  runs `node server.js` from the standalone output.
- **`fly.toml`** — Fly.io target with `release_command = "npx prisma migrate
deploy"` and the `/api/healthz` check.
- **`.github/workflows/deploy.yml`** — manual (`workflow_dispatch`), guarded on the
  `DEPLOY_ENABLED` repo variable so it never auto-runs before a target exists.

### ⚠ Remaining before a build actually runs

1. **Postgres adapter — DONE.** `src/lib/db.ts` now selects the driver adapter by
   `DATABASE_URL` scheme: `@prisma/adapter-pg` for `postgres://`/`postgresql://`,
   `@prisma/adapter-better-sqlite3` for `file:` (local dev + CI). Adapters are
   dynamically imported so production never loads better-sqlite3 (whose native
   binding is not traced into `.next/standalone`). Verified: SQLite path
   unchanged (build prerenders 95 pages off it); the Postgres adapter constructs
   from a connection string; types clean. The Postgres path is not runtime-tested
   here (no Postgres instance) — exercise it with `fly postgres` on first deploy.
2. **Validate the `Dockerfile`** against a real `docker build` (image size target
   ≤ 250 MB; confirm the standalone COPY paths and that `prisma migrate deploy`
   works from the runtime image).

### First-time setup (Fly.io)

1. `fly launch --no-deploy` (or `fly apps create treaty-lab`).
2. `fly postgres create` then `fly postgres attach` — sets `DATABASE_URL`.
3. `fly secrets set DATABRICKS_CLIENT_ID=… DATABRICKS_CLIENT_SECRET=… APP_URL=https://treaty-lab.fly.dev`
   (see the AI-003 + auth sections above for the full env list).
4. Set repo variable `DEPLOY_ENABLED=true` and secret `FLY_API_TOKEN`
   (`fly tokens create deploy`), then run the **Deploy** workflow.

### Operations

- **Migrations** run automatically per release via `fly.toml`'s `release_command`.
- **Secret rotation** — `fly secrets set …` triggers a rolling restart; rotate the
  Databricks service-principal secret and `FLY_API_TOKEN` periodically.
- **Database backup** — Fly Postgres snapshots (`fly postgres … ` / volume
  snapshots); take one before each migration-bearing release.
- **Rollback** — `fly releases` to list, `fly deploy --image <previous>` (or
  `fly releases rollback`) to revert; a reverted release re-runs the
  `release_command`, so keep migrations backward-compatible.
- **Health** — the platform polls `/api/healthz`; `gateway: "down"` with `db:
"ok"` still returns 200 (the app serves; only chat is impaired).
