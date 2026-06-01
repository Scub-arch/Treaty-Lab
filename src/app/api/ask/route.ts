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
import {
  getProject,
  getModule,
  getIndicator,
  resolveIndicators,
  resolveProjects,
  getEvidenceItem,
  allClaimsForProject,
} from "@/lib/content";
import type { Domain, ProjectAssessment, Indicator } from "@/lib/content/types";
import {
  chatTreaty,
  ANALYST_SYSTEM_PROMPT,
  retrieveEvidence,
  formatRetrievedContext,
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

  // Build RAG context block
  const contextBlocks: string[] = [];
  const summary = { projectsCount: 0, indicatorsCount: 0, evidenceCount: 0 };

  if (body.context?.projectSlug) {
    const project = getProject(body.context.projectSlug);
    if (project) {
      contextBlocks.push(formatProjectContext(project));
      summary.projectsCount = 1;
      summary.evidenceCount += project.primarySources.length;
    }
  }

  if (body.context?.domain) {
    const mod = getModule(body.context.domain);
    if (mod) {
      const featProjects = resolveProjects(mod.featuredProjectSlugs);
      const featIndicators = resolveIndicators(mod.featuredIndicatorSlugs);
      contextBlocks.push(
        formatDomainContext(body.context.domain, mod.lede, featProjects, featIndicators),
      );
      summary.projectsCount += featProjects.length;
      summary.indicatorsCount += featIndicators.length;
    }
  }

  if (body.context?.indicatorSlugs?.length) {
    const indicators = body.context.indicatorSlugs
      .map((s) => getIndicator(s))
      .filter((x): x is Indicator => Boolean(x));
    contextBlocks.push(formatIndicatorsContext(indicators));
    summary.indicatorsCount += indicators.length;
    for (const ind of indicators) {
      summary.evidenceCount += ind.sources?.length ?? 0;
    }
  }

  // AI-004: when no explicit context was picked, retrieve relevant evidence
  // (BM25 over the library) and inline it so the model can cite by slug.
  const retrieveDisabled =
    new URL(req.url).searchParams.get("retrieve") === "false" || body.retrieve === false;
  if (contextBlocks.length === 0 && !retrieveDisabled) {
    const hits = retrieveEvidence(body.question, 5);
    if (hits.length > 0) {
      contextBlocks.push(formatRetrievedContext(hits));
      summary.evidenceCount += hits.length;
    }
  }

  const userMessage =
    contextBlocks.length > 0
      ? [
          "## Provided context",
          contextBlocks.join("\n\n---\n\n"),
          "",
          "## Question",
          body.question,
        ].join("\n")
      : body.question;

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

// ---------------------------------------------------------------------------
// Context formatters
// ---------------------------------------------------------------------------

function formatProjectContext(p: ProjectAssessment): string {
  const claims = allClaimsForProject(p);
  const claimSummary = claims
    .map(
      (c) =>
        `- [${c.kind.toUpperCase()}] ${c.text}${c.sources ? ` (sources: ${c.sources.map((s) => s.evidenceSlug).join(", ")})` : ""}`,
    )
    .join("\n");

  return [
    `### Project: ${p.name} (${p.slug})`,
    `Status: ${p.status} · Location: ${p.location} · Jurisdictions: ${p.jurisdictions.join(", ")}`,
    `Proponent: ${p.proponent}`,
    `Summary: ${p.summary}`,
    `Government objective: ${p.governmentObjective}`,
    `Proponent objective: ${p.proponentObjective}`,
    `Evidence confidence: ${p.evidenceConfidence}`,
    "",
    "Claims:",
    claimSummary,
    "",
    `Finance structure: ${p.finance.structure}`,
    p.finance.totalCostEstimate ? `Cost estimate: ${p.finance.totalCostEstimate}` : "",
    `Risk carrier: ${p.finance.riskCarrier}`,
    "",
    `Primary sources: ${p.primarySources.map((s) => `${s.evidenceSlug} — ${s.citing}`).join("; ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function formatDomainContext(
  domain: Domain,
  lede: string,
  projects: ProjectAssessment[],
  indicators: Indicator[],
): string {
  const projLines = projects.map((p) => `- ${p.name} (${p.slug}): ${p.summary}`).join("\n");
  const indLines = indicators
    .map(
      (i) =>
        `- ${i.name} (${i.slug}): ${i.value} · severity=${i.severity} trend=${i.trend} — ${i.summary}`,
    )
    .join("\n");
  return [
    `### Domain: ${domain}`,
    `Module lede: ${lede}`,
    "",
    `Featured projects (${projects.length}):`,
    projLines,
    "",
    `Featured indicators (${indicators.length}):`,
    indLines,
  ].join("\n");
}

function formatIndicatorsContext(indicators: Indicator[]): string {
  const lines = indicators.map((i) => {
    const sources = i.sources
      ? `\n  Sources: ${i.sources.map((s) => `${s.evidenceSlug} — ${s.citing}`).join("; ")}`
      : "";
    const evidenceDetails = i.sources
      ? i.sources
          .map((s) => {
            const e = getEvidenceItem(s.evidenceSlug);
            return e
              ? `\n    [${e.slug}] ${e.title} (${e.sourceType}, reliability=${e.reliability})`
              : "";
          })
          .join("")
      : "";
    return [
      `- ${i.name} (${i.slug})`,
      `  Domain: ${i.domain} · Severity: ${i.severity} · Trend: ${i.trend}`,
      `  Value: ${i.value}`,
      `  Summary: ${i.summary}`,
      i.note ? `  Note: ${i.note}` : "",
      sources + evidenceDetails,
    ]
      .filter(Boolean)
      .join("\n");
  });
  return ["### Indicators", ...lines].join("\n");
}
