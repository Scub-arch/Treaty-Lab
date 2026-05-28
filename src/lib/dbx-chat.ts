/**
 * Server-side Databricks AI Gateway client for Treaty-Lab.
 *
 * Wraps the same OAuth + chat-completions recipe as C:\Claude\scripts\dbx-chat.{ps1,mjs}
 * and reuses their shared token cache file (~/.dbx-token.cache.json) so all three
 * clients (PS, Node CLI, this server-side helper) share auth state.
 *
 * Auth precedence (first that works wins):
 *   1. Cached OAuth token from ~/.dbx-token.cache.json (if not expired)
 *   2. Fresh OAuth via `databricks auth token --host <ws>` (local dev path)
 *   3. process.env.DATABRICKS_TOKEN as a static fallback (production deploy path)
 *
 * IMPORTANT — local dev only as written. Production deploy (Vercel / Astro Cloud / etc.)
 * does NOT have the `databricks` CLI binary on the server. For production:
 *   - Provision a Databricks service principal with OAuth M2M credentials
 *   - Set DATABRICKS_CLIENT_ID + DATABRICKS_CLIENT_SECRET as server env vars
 *   - Add an M2M token-fetch path (Databricks SDK or direct OAuth POST)
 * The fallback to DATABRICKS_TOKEN env covers the simpler PAT case; M2M needs more code.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_WORKSPACE_HOST = "https://dbc-2bbf7706-fc3d.cloud.databricks.com";
const DEFAULT_GATEWAY_HOST = "https://7474657386881097.ai-gateway.cloud.databricks.com";
const DEFAULT_MODEL = "treaty";
const CACHE_FILE = join(homedir(), ".dbx-token.cache.json");
const CACHE_TTL_SECONDS = 50 * 60;

const WORKSPACE_HOST = process.env.DATABRICKS_HOST ?? DEFAULT_WORKSPACE_HOST;
const GATEWAY_HOST = process.env.DATABRICKS_AI_GATEWAY_HOST ?? DEFAULT_GATEWAY_HOST;

// ---------------------------------------------------------------------------
// Types — mirror OpenAI chat-completions + Databricks reasoning-model shapes
// ---------------------------------------------------------------------------

export type Role = "system" | "user" | "assistant";

export interface Message {
  role: Role;
  content: string;
}

export interface ChatOpts {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** Force a fresh token (skip cache). */
  noCache?: boolean;
}

export interface ChatResult {
  /** Final assistant text (extracted from reasoning-model array if needed). */
  answer: string;
  /** Reasoning trace if the model emitted one; undefined for non-reasoning models. */
  reasoning?: string;
  /** Token usage as reported by the API. */
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  /** Model that actually served the request (after alias resolution). */
  model?: string;
}

interface CacheRecord {
  token: string;
  expires_at: number;
  host: string;
  cached_at?: string;
}

// ---------------------------------------------------------------------------
// Token cache (compatible with dbx-chat.ps1 + dbx-chat.mjs)
// ---------------------------------------------------------------------------

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
  // Windows winget shim paths first; fall back to PATH lookup
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

function getToken(noCache = false): string {
  const cached = loadCachedToken(noCache);
  if (cached) return cached;

  const fresh = fetchTokenViaCli();
  if (fresh) return fresh;

  // Production fallback — static PAT in env
  const envToken = process.env.DATABRICKS_TOKEN;
  if (envToken) return envToken;

  throw new Error(
    "No Databricks auth available. Tried: cached OAuth token, `databricks auth token` CLI, " +
      "$DATABRICKS_TOKEN env var. For local dev run `databricks auth login --host " +
      WORKSPACE_HOST +
      "`. For production set DATABRICKS_TOKEN or implement M2M service-principal OAuth.",
  );
}

// ---------------------------------------------------------------------------
// Chat-completions call
// ---------------------------------------------------------------------------

export async function chatTreaty(messages: Message[], opts: ChatOpts = {}): Promise<ChatResult> {
  const token = getToken(opts.noCache);
  const endpoint = `${GATEWAY_HOST}/mlflow/v1/chat/completions`;

  const body = {
    model: opts.model ?? DEFAULT_MODEL,
    messages,
    max_tokens: opts.maxTokens ?? 2000,
    temperature: opts.temperature ?? 0.7,
  };

  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Databricks gateway HTTP ${r.status}: ${text}`);
  }

  const json = (await r.json()) as {
    model?: string;
    usage?: ChatResult["usage"];
    choices?: Array<{
      message?: {
        content?:
          | string
          | Array<
              | { type: "text"; text: string }
              | {
                  type: "reasoning";
                  summary?: Array<{ type: "summary_text"; text: string }>;
                  text?: string;
                }
            >;
      };
    }>;
    error?: unknown;
  };

  if (json.error) {
    throw new Error(`Databricks gateway error: ${JSON.stringify(json.error)}`);
  }

  const content = json.choices?.[0]?.message?.content;
  if (content == null) {
    throw new Error("Databricks response had no choices[0].message.content");
  }

  if (typeof content === "string") {
    return { answer: content, usage: json.usage, model: json.model };
  }

  // Reasoning-model shape — array of segments.
  const answerParts = content.filter((s) => s.type === "text").map((s) => s.text);
  const reasoningParts = content
    .filter((s) => s.type === "reasoning")
    .map((s) => {
      if (s.summary) return s.summary.map((x) => x.text).join("\n");
      return s.text ?? "";
    })
    .filter(Boolean);

  return {
    answer: answerParts.join("\n"),
    reasoning: reasoningParts.length ? reasoningParts.join("\n") : undefined,
    usage: json.usage,
    model: json.model,
  };
}

// ---------------------------------------------------------------------------
// Convenience — single-turn helper
// ---------------------------------------------------------------------------

export async function askTreaty(
  prompt: string,
  system?: string,
  opts: ChatOpts = {},
): Promise<ChatResult> {
  const messages: Message[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });
  return chatTreaty(messages, opts);
}
