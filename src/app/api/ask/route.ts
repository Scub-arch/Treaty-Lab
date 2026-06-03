/**
 * POST /api/ask — server-side Q&A endpoint backed by the Databricks AI Gateway
 * `treaty` serving endpoint (currently gpt-oss-120b-080525).
 *
 * Assembles RAG context from src/content/*.json + the new aggregations helpers,
 * routes to dbx-chat.ts, and returns a structured response.
 *
 * Request body:
 *   {
 *     question: string,                  // required
 *     context?: {
 *       projectSlug?: string,            // include that project's full assessment
 *       domain?: Domain,                 // include module config + featured items
 *       indicatorSlugs?: string[],       // include specific indicators
 *     },
 *     reasoning?: boolean,               // include reasoning trace in response (default false)
 *     maxTokens?: number,                // default 1500
 *     temperature?: number,              // default 0.3 (lower for analyst-Q&A)
 *   }
 *
 * Response:
 *   {
 *     answer: string,
 *     reasoning?: string,
 *     usage?: { prompt_tokens?, completion_tokens?, total_tokens? },
 *     model?: string,
 *     contextSummary: { projectsCount, indicatorsCount, evidenceCount }
 *   }
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { checkChatRateLimit, rateLimitResponseInit } from "@/lib/ratelimit";
import type { Domain } from "@/lib/content/types";
import {
  chatTreaty,
  ANALYST_SYSTEM_PROMPT,
  retrieveEvidence,
  formatRetrievedContext,
  buildContextBlock,
  buildAskUserMessage,
  type Message,
} from "@/lib/llm";

interface AskRequest {
  question: string;
  context?: {
    projectSlug?: string;
    domain?: Domain;
    indicatorSlugs?: string[];
  };
  reasoning?: boolean;
  maxTokens?: number;
  temperature?: number;
  /** AI-004: set false to skip auto evidence retrieval when no context is picked. */
  retrieve?: boolean;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const startedAt = Date.now();

  const limited = await checkChatRateLimit(session);
  if (limited) {
    logger.warn(
      {
        event: "ask.ratelimited",
        userId: session.userId,
        orgId: session.orgId,
        scope: limited.scope,
      },
      "chat rate limit hit",
    );
    const { body, headers } = rateLimitResponseInit(limited);
    return NextResponse.json(body, { status: 429, headers });
  }

  let body: AskRequest;
  try {
    body = (await req.json()) as AskRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.question || typeof body.question !== "string") {
    return NextResponse.json(
      { error: "`question` is required and must be a string" },
      { status: 400 },
    );
  }

  // Build the RAG context block from the explicit selection (formatters shared
  // with the streaming route via src/lib/llm/context.ts).
  const { block: explicitBlock, summary } = buildContextBlock(body.context);
  let contextBlock = explicitBlock;

  // AI-004: when no explicit context was picked, retrieve relevant evidence
  // (BM25 over the library) and inline it so the model can cite by slug.
  const retrieveDisabled =
    new URL(req.url).searchParams.get("retrieve") === "false" || body.retrieve === false;
  if (!contextBlock && !retrieveDisabled) {
    const hits = retrieveEvidence(body.question, 5);
    if (hits.length > 0) {
      contextBlock = formatRetrievedContext(hits);
      summary.evidenceCount += hits.length;
    }
  }

  const userMessage = buildAskUserMessage(body.question, contextBlock);

  const messages: Message[] = [
    { role: "system", content: ANALYST_SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  const cacheNoStore = new URL(req.url).searchParams.get("cache") === "no-store";

  try {
    const result = await chatTreaty(messages, {
      maxTokens: body.maxTokens ?? 1500,
      temperature: body.temperature ?? 0.3,
      cache: cacheNoStore ? "no-store" : undefined,
    });

    logger.info(
      {
        event: "ask",
        userId: session.userId,
        orgId: session.orgId,
        model: result.model,
        cacheHit: Boolean(result.cached),
        promptTokens: result.usage?.prompt_tokens,
        completionTokens: result.usage?.completion_tokens,
        evidenceCount: summary.evidenceCount,
        durationMs: Date.now() - startedAt,
      },
      "chat answered",
    );

    return NextResponse.json({
      answer: result.answer,
      ...(body.reasoning && result.reasoning ? { reasoning: result.reasoning } : {}),
      ...(result.cached ? { cached: true } : {}),
      usage: result.usage,
      model: result.model,
      contextSummary: summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      {
        event: "ask.error",
        userId: session.userId,
        orgId: session.orgId,
        durationMs: Date.now() - startedAt,
        err: message,
      },
      "chat gateway error",
    );
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
