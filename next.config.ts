import type { NextConfig } from "next";

// SEC-003 — Content Security Policy. Shipped in REPORT-ONLY mode first so it
// cannot break live UI (notably recharts/cobe), while the policy is validated
// against real pages. Flip the header key to "Content-Security-Policy" to
// enforce; hardening `script-src` to a nonce (dropping 'unsafe-inline') is the
// follow-up — see docs/DEPLOY.md.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "img-src 'self' data: blob:",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "font-src 'self' data:",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join("; ");

// SEC-003 — default-deny security headers applied to every response.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  // DPL-001: emit a self-contained server bundle (.next/standalone/server.js)
  // so the runtime Docker stage ships only traced deps, not all of node_modules.
  output: "standalone",

  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
