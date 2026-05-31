# SEC-001 Implementation Plan — Authentication (hand-rolled session + magic-link)

> Status: **approved 2026-05-31 — implementation in progress on `sec-001-authjs`.**
> Ticket: `docs/LINEAR_BACKLOG.md` SEC-001. Priority **P0** (blocks DATA-003, SEC-002,
> AI-002 budget, UI-002 cross-device, DPL-001).
> Lane 1 per [`V0.3-COMPLETION-PLAN.md`](V0.3-COMPLETION-PLAN.md) — owns
> `prisma/schema.prisma`, `prisma/seed.ts`, and the route-protection layer.

## Decisions (locked)

- **Hand-rolled session + magic-link**, not Auth.js. Rationale: Auth.js v5 is beta and
  its Next.js integration targets the now-renamed `middleware`/Edge conventions; Next 16
  diverges enough from training data (`AGENTS.md`) that library compat is unverified and
  risky. DIY produces the exact criteria models and keeps zero external-auth-lib risk. The
  scope is session management (random token → hashed storage → httpOnly cookie → expiry →
  single-use), not inventing crypto.
- **`src/proxy.ts`, not `src/middleware.ts`.** Next 16 deprecated `middleware` → `proxy`,
  which runs on the **Node.js runtime** (not configurable). This is what makes DIY clean:
  a Node-runtime proxy can run `better-sqlite3` + Prisma if needed.
- **Magic-link delivery: console-log in dev**, behind a pluggable `sendEmail()` so real SMTP
  drops in for prod without touching call sites.
- **Session strategy: database sessions** (a `Session` row per sign-in), required for the
  `orgId`-carrying Session model the backlog specifies.

## Schema — 5 new models in `prisma/schema.prisma`

Conventions match existing models (`cuid()` ids, `createdAt`/`updatedAt`). Dual-target safe
(no enums, no scalar lists) so the Postgres generator keeps working.

- **`Org`** — `slug @unique`, `name`. Relations: `users User[]`, `sessions Session[]`.
  Every user and session carries an `orgId` (backlog requirement; AI-002 + UI-002 depend on it).
- **`User`** — `email @unique`, `name?`, `emailVerified?`, `image?`, `orgId`. Relations:
  `org`, `accounts Account[]`, `sessions Session[]`.
- **`Account`** — OAuth-linking table for future providers (`provider`, `providerAccountId`,
  `type`, token fields). `@@unique([provider, providerAccountId])`. Email-only sign-in does
  not populate it yet; included to satisfy the criteria + avoid a later migration.
- **`Session`** — `sessionToken @unique` (**stores the SHA-256 hash**, not the raw token),
  `userId`, `orgId`, `expires`. The cookie holds the raw token; validation hashes it and looks
  up by hash, so a DB leak never exposes live sessions.
- **`VerificationToken`** — magic-link tokens: `identifier` (email), `token @unique` (**hash**),
  `expires`. `@@unique([identifier, token])`. Single-use: deleted on consume.

`onDelete`: `Session`/`Account` cascade from `User`; `User`/`Session` use `Restrict` to `Org`.

## Security model

- **Token generation:** `crypto.randomBytes(32).toString("base64url")` for both magic-link and
  session tokens. Only the SHA-256 hash is persisted.
- **Magic-link:** 15-minute expiry, single-use (deleted on consume), constant-time hash lookup.
- **Session:** 30-day expiry (matches UI-002). Cookie `tl_session`: `httpOnly`, `sameSite=lax`,
  `secure` in prod, `path=/`.
- **Org bootstrap:** first sign-in for a new email creates a `User` + a personal `Org`.

## Files & phases

1. **Schema + migration** — 5 models, `prisma migrate dev`, regenerate Postgres schema.
2. **Auth core** `src/lib/auth/` — `tokens.ts` (random + hash), `email.ts` (pluggable sender,
   dev=console), `magic-link.ts` (create/consume VerificationToken), `session.ts`
   (create/get/destroy), `index.ts` exporting `auth()` (current session/user/org or null) +
   `requireAuth()`.
3. **Auth routes + `/login`** — `POST /api/auth/signin` (email → user+org upsert → magic link →
   send), `GET /api/auth/callback` (consume → create session → set cookie → redirect to `next`),
   `POST /api/auth/signout`. `/login` page with email form.
4. **Route protection** — `src/proxy.ts` (redirect to `/login?next=…` for all routes except
   `/`, `/login`, `/api/auth/*`, static assets). `/api/ask` + `/api/ask/stream` call `auth()` →
   **401** if unauthenticated. TopBar gains a sign-out control when authed.
5. **Docs** — `docs/DEPLOY.md` auth section (env vars: `AUTH_SECRET`, `APP_URL`, SMTP for prod).

## Verification

- `npm run check` green (incl. `tsc` against the new Prisma models).
- `npm run build` — 89+ pages still build; `/login` renders.
- Manual: `POST /api/auth/signin {email}` logs a magic link → GET it → cookie set → `/api/ask`
  returns 200; without the cookie `/api/ask` returns 401 and protected pages redirect to `/login`.
- Sign-out clears the cookie and the session row.

## Out of scope (later tickets)

- OAuth providers (the `Account` table is ready but unused).
- Rate limiting (SEC-002), per-org token budget (AI-002), audit log (DATA-003).
- Real SMTP wiring (prod concern; the sender interface is in place).
