/**
 * Streaming variant of the Databricks AI Gateway chat-completions call.
 *
 * Reuses the same OAuth path as `dbx-chat.ts` (cached token, CLI fallback,
 * static PAT env var) but issues `stream: true` and parses the OpenAI-style
 * SSE response into discriminated chunks the dashboard chat panel can render
 * incrementally.
 *
 * The skill spec calls for THOUGHT / FINAL_RESPONSE / SUGGESTION segregation.
 * The Databricks "treaty" endpoint (gpt-oss-120b reasoning model) emits a
 * mixed content array in non-streaming mode (text + reasoning segments).
 * In streaming mode each chunk's `delta` may contain:
 *   - `content`: string  → emit as FINAL_RESPONSE
 *   - `reasoning_content`: string  → emit as THOUGHT  (DeepSeek-style)
 *   - `reasoning`: { summary?: [{ text }], text? }  → emit as THOUGHT
 *   - structured content array (rare in streaming) → split per-segment
 *
 * SUGGESTIONs are not native to this gateway — the chat panel will skip them
 * unless we synthesize follow-ups via a separate call (out of scope for v0.1).
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { Message } from "./dbx-chat";

const DEFAULT_WORKSPACE_HOST = "https://dbc-2bbf7706-fc3d.cloud.databricks.com";
const DEFAULT_GATEWAY_HOST = "https://7474657386881097.ai-gateway.cloud.databricks.com";
const DEFAULT_MODEL = "treaty";
const CACHE_FILE = join(homedir(), ".dbx-token.cache.json");
const CACHE_TTL_SECONDS = 50 * 60;

const WORKSPACE_HOST = process.env.DATABRICKS_HOST ?? DEFAULT_WORKSPACE_HOST;
const GATEWAY_HOST = process.env.DATABRICKS_AI_GATEWAY_HOST ?? DEFAULT_GATEWAY_HOST;

export type StreamEvent =
  | { type: "thought"; text: string }
  | { type: "content"; text: string }
  | { type: "model"; model: string }
  | {
      type: "usage";
      usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    }
  | { type: "done" }
  | { type: "error"; error: string };

export interface StreamOpts {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** Force a fresh token (skip cache). */
  noCache?: boolean;
  /** Abort signal forwarded to fetch. */
  signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Token cache — duplicated from dbx-chat.ts so this module is independent.
// (Refactoring into a shared helper would touch the existing /api/ask route;
// keep diff small for v0.1.)
// ---------------------------------------------------------------------------

interface CacheRecord {
  token: string;
  expires_at: number;
  host: string;
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
  };
  try {
    writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), { encoding: "utf8" });
  } catch {
    // Non-fatal — token still usable for this call.
  }
}

function fetchTokenViaCli(): string | null {
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
  const envToken = process.env.DATABRICKS_TOKEN;
  if (envToken) return envToken;
  throw new Error(
    "No Databricks auth available. Tried: cached OAuth token, `databricks auth token` CLI, " +
      "$DATABRICKS_TOKEN env var. For local dev run `databricks auth login --host " +
      WORKSPACE_HOST +
      "`.",
  );
}

// ---------------------------------------------------------------------------
// Streaming call
// ---------------------------------------------------------------------------

/**
 * Async generator that yields normalized chunks from the Databricks gateway.
 * Caller is responsible for serializing chunks to SSE (or whatever transport).
 */
export async function* chatTreatyStream(
  messages: Message[],
  opts: StreamOpts = {},
): AsyncGenerator<StreamEvent> {
  let token: string;
  try {
    token = getToken(opts.noCache);
  } catch (err) {
    yield { type: "error", error: err instanceof Error ? err.message : String(err) };
    return;
  }

  const endpoint = `${GATEWAY_HOST}/mlflow/v1/chat/completions`;
  const body = {
    model: opts.model ?? DEFAULT_MODEL,
    messages,
    max_tokens: opts.maxTokens ?? 1500,
    temperature: opts.temperature ?? 0.3,
    stream: true,
  };

  let r: Response;
  try {
    r = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (err) {
    yield {
      type: "error",
      error: `Gateway fetch failed: ${err instanceof Error ? err.message : String(err)}`,
    };
    return;
  }

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    yield { type: "error", error: `Gateway HTTP ${r.status}: ${text.slice(0, 500)}` };
    return;
  }

  if (!r.body) {
    yield { type: "error", error: "Gateway response had no body stream" };
    return;
  }

  const reader = r.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let modelEmitted = false;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Split on SSE event boundaries (\n\n)
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        for (const ev of parseSseBlock(rawEvent)) {
          if (ev === "[DONE]") {
            // OpenAI's terminal marker — let the outer loop close out.
            continue;
          }
          let parsed: ChatCompletionChunk;
          try {
            parsed = JSON.parse(ev) as ChatCompletionChunk;
          } catch {
            continue;
          }
          if (!modelEmitted && parsed.model) {
            yield { type: "model", model: parsed.model };
            modelEmitted = true;
          }
          for (const out of extractFromChunk(parsed)) yield out;
        }
      }
    }
    // Drain anything left in buffer that isn't terminated with \n\n.
    if (buffer.trim().length > 0) {
      for (const ev of parseSseBlock(buffer)) {
        if (ev === "[DONE]") continue;
        try {
          const parsed = JSON.parse(ev) as ChatCompletionChunk;
          for (const out of extractFromChunk(parsed)) yield out;
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    yield {
      type: "error",
      error: `Stream read failed: ${err instanceof Error ? err.message : String(err)}`,
    };
    return;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }

  yield { type: "done" };
}

// ---------------------------------------------------------------------------
// SSE block parsing — pull every `data:` line out of one event block.
// ---------------------------------------------------------------------------

function parseSseBlock(block: string): string[] {
  const out: string[] = [];
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    out.push(trimmed.slice(5).trim());
  }
  return out;
}

// ---------------------------------------------------------------------------
// Chunk type narrowing
// ---------------------------------------------------------------------------

interface ChatCompletionChunk {
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  choices?: Array<{
    delta?: {
      content?:
        | string
        | Array<
            | { type: "text"; text: string }
            | { type: "reasoning"; text?: string; summary?: Array<{ text: string }> }
          >;
      /** DeepSeek-style separate reasoning channel */
      reasoning_content?: string;
      /** Databricks reasoning-model nested shape */
      reasoning?: string | { text?: string; summary?: Array<{ text: string }> };
      role?: string;
    };
    finish_reason?: string | null;
  }>;
}

function* extractFromChunk(chunk: ChatCompletionChunk): Generator<StreamEvent> {
  if (chunk.usage) {
    yield { type: "usage", usage: chunk.usage };
  }
  const choice = chunk.choices?.[0];
  if (!choice?.delta) return;
  const delta = choice.delta;

  // DeepSeek-style reasoning channel
  if (typeof delta.reasoning_content === "string" && delta.reasoning_content.length > 0) {
    yield { type: "thought", text: delta.reasoning_content };
  }

  // Databricks-style nested reasoning object
  if (delta.reasoning != null) {
    if (typeof delta.reasoning === "string") {
      if (delta.reasoning.length > 0) yield { type: "thought", text: delta.reasoning };
    } else {
      if (delta.reasoning.text) yield { type: "thought", text: delta.reasoning.text };
      if (delta.reasoning.summary) {
        for (const s of delta.reasoning.summary) {
          if (s.text) yield { type: "thought", text: s.text };
        }
      }
    }
  }

  // Standard content channel
  if (typeof delta.content === "string") {
    if (delta.content.length > 0) yield { type: "content", text: delta.content };
  } else if (Array.isArray(delta.content)) {
    for (const seg of delta.content) {
      if (seg.type === "text" && seg.text) {
        yield { type: "content", text: seg.text };
      } else if (seg.type === "reasoning") {
        if (seg.text) yield { type: "thought", text: seg.text };
        if (seg.summary) {
          for (const s of seg.summary) {
            if (s.text) yield { type: "thought", text: s.text };
          }
        }
      }
    }
  }
}
