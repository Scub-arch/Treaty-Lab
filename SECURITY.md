# Security Policy

Treaty-Lab is a research-intelligence pilot. It handles no production user data
beyond passwordless sign-in identities. Still, we take the basics seriously.

## Supported versions

The pilot ships from `main`; only the latest `main` is supported. There are no
tagged releases yet.

## Reporting a vulnerability

Email **owenbreast@outlook.com** with details and reproduction steps. Please do
not open a public issue for security reports. Expect an acknowledgement within a
few business days.

## Hardening in place

- **Authentication (SEC-001).** Passwordless magic-link sign-in; 30-day database
  sessions with **SHA-256-hashed** session tokens (the cookie holds the raw
  value, only the hash is stored). Cookie is `httpOnly`, `sameSite=lax`, and
  `secure` in production. Magic links are 15-minute, single-use, hashed at rest.
  `src/proxy.ts` gates every route except `/`, `/login`, `/api/auth/*`, and
  static assets.
- **Rate limiting (SEC-002).** Per-user (10/min) and per-org (100/hour) limits on
  the chat endpoints; `429` with `Retry-After`.
- **Security headers (SEC-003)** — applied to every response via
  `next.config.ts`:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - **Content Security Policy** — shipped in **report-only** mode first
    (`Content-Security-Policy-Report-Only`) so it cannot break live UI while the
    policy is validated. Current policy:
    `default-src 'self'; base-uri 'self'; img-src 'self' data: blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'; form-action 'self'`.

### CSP follow-up

To enforce: change the header key from `Content-Security-Policy-Report-Only` to
`Content-Security-Policy` in `next.config.ts` after confirming no violations on
the chart-bearing pages (recharts/cobe). The stronger target drops
`'unsafe-inline'` from `script-src` in favour of a per-request nonce via the
Next.js nonce flow.

## Secrets

No secrets are committed. `.env` is gitignored; `.env.example` lists every
variable with placeholder values. Production secrets (Databricks
service-principal, database URL) are supplied as deploy-platform secrets — see
[`docs/DEPLOY.md`](docs/DEPLOY.md).
