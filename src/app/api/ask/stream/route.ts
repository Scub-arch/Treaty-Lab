/**
 * POST /api/ask/stream — SSE streaming variant of /api/ask.
 *
 * Wire format: text/event-stream, one JSON-encoded StreamEvent per `data:` line,
 * separated by blank lines. Frontend reads via fetch + getReader().
 *
 * Event types (see StreamEvent in src/lib/llm/databricks-chat.ts):
 *   { type: "thought",  text: "..." }   reasoning chunk
 *   { type: "content",  text: "..." }   final-response chunk
 *   { type: "model",    model: "..." }  emitted once at start
 *   { type: "usage",    usage: {...} }  emitted at end if gateway provides it
 *   { type: "error",    error: "..." }  fatal failure — client should stop
 *   { type: "done" }                    terminal marker
 *
 * Multi-turn support: client sends the full `messages` array (system + user/assistant
 * history). Server appends the freshly-constructed system prompt only on the first
 * turn (when no system message is present in the incoming array).
 */

import type { Domain } from "@/lib/content/types";
import { auth } from "@/lib/auth";
import { checkChatRateLimit, rateLimitResponseInit } from "@/lib/ratelimit";
import {
  chatTreatyStream,
  ANALYST_SYSTEM_PROMPT_MARKDOWN,
  retrieveEvidence,
  formatRetrievedContext,
  buildContextBlock,
  buildAskUserMessage,
  type StreamEvent,
  type Message,
} from "@/lib/llm";

export const runtime = "nodejs";

interface AskStreamRequest {
  /** Full conversation history (system + user + assistant turns). */
  messages?: Message[];
  /** Convenience: a single user question — appended to messages if messages is empty. */
  question?: string;
  context?: {
    projectSlug?: string;
    domain?: Domain;
    indicatorSlugs?: string[];
  };
  /** AI-004: set false to skip auto evidence retrieval when no context is picked. */
  retrieve?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return new Response(JSON.stringify({ error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const limited = await checkChatRateLimit(session);
  if (limited) {
    const { body: rlBody, headers } = rateLimitResponseInit(limited);
    return new Response(JSON.stringify(rlBody), {
      status: 429,
      headers: { "Content-Type": "application/json", ...headers },
    });
  }

  let body: AskStreamRequest;
  try {
    body = (await req.json()) as AskStreamRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Build the message array we'll send to the gateway.
  let messages: Message[] = Array.isArray(body.messages) ? body.messages.slice() : [];

  // First turn? Prepend system prompt + optional context block.
  const hasSystem = messages.some((m) => m.role === "system");
  if (!hasSystem) {
    messages = [{ role: "system", content: ANALYST_SYSTEM_PROMPT_MARKDOWN }, ...messages];
  }

  // If the client passed only `question`, fold it in as a final user turn,
  // wrapped with the requested context block.
  if (body.question) {
    let contextBlock = buildContextBlock(body.context).block;
    // AI-004: no explicit context → retrieve relevant evidence (BM25) to cite.
    const retrieveDisabled =
      new URL(req.url).searchParams.get("retrieve") === "false" || body.retrieve === false;
    if (!contextBlock && !retrieveDisabled) {
      const hits = retrieveEvidence(body.question, 5);
      if (hits.length > 0) contextBlock = formatRetrievedContext(hits);
    }
    const userMessage = buildAskUserMessage(body.question, contextBlock);
    messages.push({ role: "user", content: userMessage });
  }

  // Reject empty conversations to avoid a useless gateway call.
  if (!messages.some((m) => m.role === "user")) {
    return new Response(JSON.stringify({ error: "No user message in conversation" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (ev: StreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
      };
      try {
        for await (const ev of chatTreatyStream(messages, {
          maxTokens: body.maxTokens ?? 1500,
          temperature: body.temperature ?? 0.3,
          cache: new URL(req.url).searchParams.get("cache") === "no-store" ? "no-store" : undefined,
          signal: req.signal,
        })) {
          write(ev);
          if (ev.type === "error" || ev.type === "done") {
            break;
          }
        }
      } catch (err) {
        write({ type: "error", error: err instanceof Error ? err.message : String(err) });
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

