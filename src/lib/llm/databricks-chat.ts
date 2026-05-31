/**
 * Databricks AI Gateway chat client (AI-001).
 *
 * Consolidates the non-streaming (`chatTreaty`) and streaming (`chatTreatyStream`)
 * calls that previously lived in dbx-chat.ts and dbx-chat-stream.ts, sharing the
 * single token-cache/auth path in ./databricks-auth.
 */

import { getToken } from "./databricks-auth";

const DEFAULT_GATEWAY_HOST = "https://7474657386881097.ai-gateway.cloud.databricks.com";
const DEFAULT_MODEL = "treaty";

const GATEWAY_HOST = process.env.DATABRICKS_AI_GATEWAY_HOST ?? DEFAULT_GATEWAY_HOST;
const ENDPOINT = `${GATEWAY_HOST}/mlflow/v1/chat/completions`;

// ---------------------------------------------------------------------------
// Types
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
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  /** Model that actually served the request (after alias resolution). */
  model?: string;
}

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
// Non-streaming chat-completions
// ---------------------------------------------------------------------------

export async function chatTreaty(messages: Message[], opts: ChatOpts = {}): Promise<ChatResult> {
  const token = getToken({ noCache: opts.noCache });

  const body = {
    model: opts.model ?? DEFAULT_MODEL,
    messages,
    max_tokens: opts.maxTokens ?? 2000,
    temperature: opts.temperature ?? 0.7,
  };

  const r = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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

/** Single-turn convenience wrapper. */
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

// ---------------------------------------------------------------------------
// Streaming chat-completions
// ---------------------------------------------------------------------------

/**
 * Async generator yielding normalized chunks from the gateway. The caller
 * serializes them to SSE (or any transport).
 */
export async function* chatTreatyStream(
  messages: Message[],
  opts: StreamOpts = {},
): AsyncGenerator<StreamEvent> {
  let token: string;
  try {
    token = getToken({ noCache: opts.noCache });
  } catch (err) {
    yield { type: "error", error: err instanceof Error ? err.message : String(err) };
    return;
  }

  const body = {
    model: opts.model ?? DEFAULT_MODEL,
    messages,
    max_tokens: opts.maxTokens ?? 1500,
    temperature: opts.temperature ?? 0.3,
    stream: true,
  };

  let r: Response;
  try {
    r = await fetch(ENDPOINT, {
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

      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        for (const ev of parseSseBlock(rawEvent)) {
          if (ev === "[DONE]") continue;
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

function parseSseBlock(block: string): string[] {
  const out: string[] = [];
  for (const line of block.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    out.push(trimmed.slice(5).trim());
  }
  return out;
}

interface ChatCompletionChunk {
  model?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  choices?: Array<{
    delta?: {
      content?:
        | string
        | Array<
            | { type: "text"; text: string }
            | { type: "reasoning"; text?: string; summary?: Array<{ text: string }> }
          >;
      reasoning_content?: string;
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

  if (typeof delta.reasoning_content === "string" && delta.reasoning_content.length > 0) {
    yield { type: "thought", text: delta.reasoning_content };
  }

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
