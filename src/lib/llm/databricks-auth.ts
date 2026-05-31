/**
 * Databricks AI Gateway auth — single source of truth (AI-001).
 *
 * Previously duplicated across dbx-chat.ts and dbx-chat-stream.ts. Wraps the
 * same OAuth + token-cache recipe as C:\Claude\scripts\dbx-chat.{ps1,mjs} and
 * shares their cache file (~/.dbx-token.cache.json).
 *
 * Auth precedence (first that works wins):
 *   1. Cached OAuth token from ~/.dbx-token.cache.json (if not expired)
 *   2. Fresh OAuth via `databricks auth token --host <ws>` (local dev path)
 *   3. process.env.DATABRICKS_TOKEN as a static PAT fallback (production)
 *
 * Local dev only as written: production servers have no `databricks` CLI. The
 * M2M service-principal path is AI-003.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_WORKSPACE_HOST = "https://dbc-2bbf7706-fc3d.cloud.databricks.com";
const CACHE_FILE = join(homedir(), ".dbx-token.cache.json");
const CACHE_TTL_SECONDS = 50 * 60;

export const WORKSPACE_HOST = process.env.DATABRICKS_HOST ?? DEFAULT_WORKSPACE_HOST;

export interface GetTokenOptions {
  /** Force a fresh token (skip the cache). */
  noCache?: boolean;
}

interface CacheRecord {
  token: string;
  expires_at: number;
  host: string;
  cached_at?: string;
}

function loadCachedToken(noCache: boolean): string | null {
  if (noCache || !existsSync(CACHE_FILE)) return null;
  try {
    const cache: CacheRecord = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    if (cache.host !== WORKSPACE_HOST) return null;
    if (cache.expires_at <= Math.floor(Date.now() / 1000)) return null;
    return cache.token;
  } catch {
    return null;
  }
}

function saveCachedToken(token: string) {
  const obj: CacheRecord = {
    token,
    expires_at: Math.floor(Date.now() / 1000) + CACHE_TTL_SECONDS,
    host: WORKSPACE_HOST,
    cached_at: new Date().toISOString(),
  };
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), { encoding: "utf8" });
  } catch {
    // Non-fatal — token still usable for this call.
  }
}

function fetchTokenViaCli(): string | null {
  // In production the CLI is absent (and slow to spawn) — skip it entirely.
  if (process.env.NODE_ENV === "production") return null;

  const candidates = [
    join(process.env.LOCALAPPDATA ?? "", "Microsoft", "WinGet", "Links", "databricks.exe"),
    join(
      process.env.LOCALAPPDATA ?? "",
      "Microsoft",
      "WinGet",
      "Packages",
      "Databricks.DatabricksCLI_Microsoft.Winget.Source_8wekyb3d8bbwe",
      "databricks.exe",
    ),
    "databricks",
  ];
  for (const exe of candidates) {
    try {
      const r = spawnSync(exe, ["auth", "token", "--host", WORKSPACE_HOST], { encoding: "utf8" });
      if (r.status === 0 && r.stdout) {
        const parsed = JSON.parse(r.stdout);
        if (parsed.access_token) {
          saveCachedToken(parsed.access_token);
          return parsed.access_token;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// M2M service-principal OAuth (AI-003) — the production auth path.
//
// POSTs client credentials to the workspace OIDC token endpoint. The token is
// cached in-process under its `expires_in`; AI-002 can move this cache to Redis
// (key `dbx:token:<workspace_host>`) so it is shared across instances.
// ---------------------------------------------------------------------------

let m2mCache: { token: string; expiresAt: number } | null = null;

/**
 * Fetch a token via the service principal, when DATABRICKS_CLIENT_ID +
 * DATABRICKS_CLIENT_SECRET are set. Returns null when the env is absent (so
 * the dev paths run); throws when the env is present but the exchange fails
 * (so a misconfigured production deploy surfaces clearly).
 */
async function fetchTokenViaServicePrincipal(noCache: boolean): Promise<string | null> {
  const clientId = process.env.DATABRICKS_CLIENT_ID;
  const clientSecret = process.env.DATABRICKS_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (!noCache && m2mCache && m2mCache.expiresAt > Date.now()) {
    return m2mCache.token;
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const r = await fetch(`${WORKSPACE_HOST}/oidc/v1/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "all-apis" }).toString(),
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`Databricks M2M token exchange HTTP ${r.status}: ${text.slice(0, 300)}`);
  }

  const json = (await r.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error("Databricks M2M token response had no access_token.");
  }

  const ttlSec = json.expires_in ?? 3600;
  // Refresh a minute early to avoid handing out a token that expires mid-call.
  m2mCache = { token: json.access_token, expiresAt: Date.now() + (ttlSec - 60) * 1000 };
  return json.access_token;
}

/**
 * Resolve a Databricks bearer token, or throw if no auth path is available.
 * Precedence: cached/fresh M2M (service principal) → cached U2M (local dev) →
 * `databricks` CLI (local dev) → DATABRICKS_TOKEN PAT (legacy).
 */
export async function getToken({ noCache = false }: GetTokenOptions = {}): Promise<string> {
  // 1. Service-principal M2M — preferred when configured (production).
  const m2m = await fetchTokenViaServicePrincipal(noCache);
  if (m2m) return m2m;

  // 2. Cached U2M OAuth token (local dev).
  const cached = loadCachedToken(noCache);
  if (cached) return cached;

  // 3. `databricks` CLI (local dev only; skipped in production by fetchTokenViaCli).
  const fresh = fetchTokenViaCli();
  if (fresh) return fresh;

  // 4. Static PAT (legacy fallback).
  const envToken = process.env.DATABRICKS_TOKEN;
  if (envToken) return envToken;

  throw new Error(
    "No Databricks auth available. Tried: service-principal M2M " +
      "(DATABRICKS_CLIENT_ID/SECRET), cached OAuth token, `databricks auth token` CLI, " +
      "$DATABRICKS_TOKEN env var. For local dev run `databricks auth login --host " +
      WORKSPACE_HOST +
      "`. For production set DATABRICKS_CLIENT_ID + DATABRICKS_CLIENT_SECRET.",
  );
}
