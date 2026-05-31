# Deployment

> Scope today: **authentication (SEC-001)**. Full infrastructure deploy
> (Dockerfile, hosting target, CI deploy workflow, health checks) is tracked in
> DPL-001 and will extend this document.

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

### Production checklist

- [ ] `DATABASE_URL` points at Postgres; run `prisma migrate deploy`.
- [ ] `APP_URL` set to the public origin (so links are not built from an internal host).
- [ ] A real `EmailSender` is wired in `src/lib/auth/email.ts`.
- [ ] Served over HTTPS (the session cookie is `Secure` in production and will not
      round-trip over plain HTTP).
- [ ] Consider tightening route protection if any currently-public page should be
      gated, and vice versa (`PUBLIC_PATHS` in `src/proxy.ts`).

## Infrastructure (DPL-001 — pending)

Dockerfile, hosting target (Fly.io / Vercel / Render), `output: "standalone"`,
deploy workflow, `GET /api/healthz`, and secret-rotation/backup/rollback runbooks
land with DPL-001.
