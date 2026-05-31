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

/** Resolve a Databricks bearer token, or throw if no auth path is available. */
export function getToken({ noCache = false }: GetTokenOptions = {}): string {
  const cached = loadCachedToken(noCache);
  if (cached) return cached;

  const fresh = fetchTokenViaCli();
  if (fresh) return fresh;

  const envToken = process.env.DATABRICKS_TOKEN;
  if (envToken) return envToken;

  throw new Error(
    "No Databricks auth available. Tried: cached OAuth token, `databricks auth token` CLI, " +
      "$DATABRICKS_TOKEN env var. For local dev run `databricks auth login --host " +
      WORKSPACE_HOST +
      "`. For production set DATABRICKS_TOKEN or implement M2M service-principal OAuth (AI-003).",
  );
}
