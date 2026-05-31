/**
 * POST /api/ask/stream — SSE streaming variant of /api/ask.
 *
 * Wire format: text/event-stream, one JSON-encoded StreamEvent per `data:` line,
 * separated by blank lines. Frontend reads via fetch + getReader().
 *
 * Event types (see src/lib/dbx-chat-stream.ts):
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
import type { Message } from "@/lib/dbx-chat";
import { auth } from "@/lib/auth";
import { chatTreatyStream, type StreamEvent } from "@/lib/dbx-chat-stream";

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
  "",
  "Format responses as Markdown. Use headings, lists, and emphasis. Cite by evidence slug.",
].join("\n");

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return new Response(JSON.stringify({ error: "Authentication required." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
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
    messages = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];
  }

  // If the client passed only `question`, fold it in as a final user turn,
  // wrapped with the requested context block.
  if (body.question) {
    const contextBlock = buildContextBlock(body.context);
    const userMessage = contextBlock
      ? ["## Provided context", contextBlock, "", "## Question", body.question].join("\n")
      : body.question;
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

function buildContextBlock(ctx: AskStreamRequest["context"]): string | null {
  if (!ctx) return null;
  const blocks: string[] = [];

  if (ctx.projectSlug) {
    const project = getProject(ctx.projectSlug);
    if (project) blocks.push(formatProjectContext(project));
  }
  if (ctx.domain) {
    const module = getModule(ctx.domain);
    if (module) {
      const featProjects = resolveProjects(module.featuredProjectSlugs);
      const featIndicators = resolveIndicators(module.featuredIndicatorSlugs);
      blocks.push(formatDomainContext(ctx.domain, module.lede, featProjects, featIndicators));
    }
  }
  if (ctx.indicatorSlugs?.length) {
    const indicators = ctx.indicatorSlugs
      .map((s) => getIndicator(s))
      .filter((x): x is Indicator => Boolean(x));
    if (indicators.length > 0) blocks.push(formatIndicatorsContext(indicators));
  }

  return blocks.length > 0 ? blocks.join("\n\n---\n\n") : null;
}

function formatProjectContext(p: ProjectAssessment): string {
  const claims = allClaimsForProject(p);
  const claimSummary = claims
    .map(
      (c) =>
        `- [${c.kind.toUpperCase()}] ${c.text}${
          c.sources ? ` (sources: ${c.sources.map((s) => s.evidenceSlug).join(", ")})` : ""
        }`,
    )
    .join("\n");

  return [
    `### Project: ${p.name} (${p.slug})`,
    `Status: ${p.status} · Location: ${p.location} · Jurisdictions: ${p.jurisdictions.join(", ")}`,
    `Proponent: ${p.proponent}`,
    `Summary: ${p.summary}`,
    `Evidence confidence: ${p.evidenceConfidence}`,
    "",
    "Claims:",
    claimSummary,
  ].join("\n");
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
