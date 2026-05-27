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
import { chatTreaty, type Message } from "@/lib/dbx-chat";

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
}

const SYSTEM_PROMPT = [
  "You are an analyst-Q&A assistant for the Treaty-Lab platform — a research-pilot",
  "intelligence terminal covering Canadian treaty rights, water, energy infrastructure,",
  "and Indigenous finance. Your audience is First Nation communities, infrastructure",
  "investors, legal/policy researchers, and government-relations teams.",
  "",
  "Core principles:",
  "1. Separate FACT (directly attested) from RISK (inferred concern), QUESTION (open),",
  "   ASSUMPTION (stated unverified), and NEEDS_VALIDATION (community/legal sign-off pending).",
  "2. Cite evidence by slug when context is provided — e.g. '[evidence: yahey-2021-bcsc-1287]'.",
  "3. Plain language — no jargon for community readers; technical precision for analysts.",
  "4. Honor the rule: NOT investment advice, NOT legal advice — this is research synthesis.",
  "5. When evidence is missing or contested, say so explicitly. Don't manufacture certainty.",
  "6. NRTA + Section 35 + UNDRIP framing is fundamental — the legal regime is contested.",
].join("\n");

export async function POST(req: Request) {
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
    const module = getModule(body.context.domain);
    if (module) {
      const featProjects = resolveProjects(module.featuredProjectSlugs);
      const featIndicators = resolveIndicators(module.featuredIndicatorSlugs);
      contextBlocks.push(formatDomainContext(body.context.domain, module.lede, featProjects, featIndicators));
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
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage },
  ];

  try {
    const result = await chatTreaty(messages, {
      maxTokens: body.maxTokens ?? 1500,
      temperature: body.temperature ?? 0.3,
    });

    return NextResponse.json({
      answer: result.answer,
      ...(body.reasoning && result.reasoning ? { reasoning: result.reasoning } : {}),
      usage: result.usage,
      model: result.model,
      contextSummary: summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

// ---------------------------------------------------------------------------
// Context formatters
// ---------------------------------------------------------------------------

function formatProjectContext(p: ProjectAssessment): string {
  const claims = allClaimsForProject(p);
  const claimSummary = claims
    .map((c) => `- [${c.kind.toUpperCase()}] ${c.text}${c.sources ? ` (sources: ${c.sources.map((s) => s.evidenceSlug).join(", ")})` : ""}`)
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
    .map((i) => `- ${i.name} (${i.slug}): ${i.value} · severity=${i.severity} trend=${i.trend} — ${i.summary}`)
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
            return e ? `\n    [${e.slug}] ${e.title} (${e.sourceType}, reliability=${e.reliability})` : "";
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
    ].filter(Boolean).join("\n");
  });
  return ["### Indicators", ...lines].join("\n");
}
