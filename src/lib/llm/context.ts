/**
 * AI-001 — shared RAG context formatting for the /api/ask routes.
 *
 * The JSON (`/api/ask`) and streaming (`/api/ask/stream`) handlers both turn a
 * caller's context selection (project / domain / indicators) into a prompt
 * context block. These formatters used to be copy-pasted across both routes and
 * had drifted apart; this module is the single canonical source — it keeps the
 * richer project formatting (objectives, finance, primary sources) from the JSON
 * route. Evidence retrieval/formatting lives in ./retrieval.
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

/** A caller's explicit context selection for an ask request. */
export interface ContextSelection {
  projectSlug?: string;
  domain?: Domain;
  indicatorSlugs?: string[];
}

/** Counts of what the explicit-context block pulled in (for response summaries). */
export interface ContextSummary {
  projectsCount: number;
  indicatorsCount: number;
  evidenceCount: number;
}

/** Result of {@link buildContextBlock}. */
export interface BuiltContext {
  /** Joined context block, or null when nothing was selected/resolved. */
  block: string | null;
  /** What the block pulled in — used by /api/ask's `contextSummary`. */
  summary: ContextSummary;
}

/** Full project assessment formatted for the model (objectives, finance, sources). */
export function formatProjectContext(p: ProjectAssessment): string {
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

/** Module/domain landing context: lede + featured projects and indicators. */
export function formatDomainContext(
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

/** A set of indicators with their sources and grounding evidence. */
export function formatIndicatorsContext(indicators: Indicator[]): string {
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

/**
 * Resolve a caller's context selection into a single context block plus the
 * counts used by /api/ask's response summary. `block` is null when nothing was
 * selected or resolved (callers then fall back to BM25 evidence retrieval).
 */
export function buildContextBlock(ctx: ContextSelection | undefined): BuiltContext {
  const summary: ContextSummary = { projectsCount: 0, indicatorsCount: 0, evidenceCount: 0 };
  if (!ctx) return { block: null, summary };

  const blocks: string[] = [];

  if (ctx.projectSlug) {
    const project = getProject(ctx.projectSlug);
    if (project) {
      blocks.push(formatProjectContext(project));
      summary.projectsCount += 1;
      summary.evidenceCount += project.primarySources.length;
    }
  }

  if (ctx.domain) {
    const mod = getModule(ctx.domain);
    if (mod) {
      const featProjects = resolveProjects(mod.featuredProjectSlugs);
      const featIndicators = resolveIndicators(mod.featuredIndicatorSlugs);
      blocks.push(formatDomainContext(ctx.domain, mod.lede, featProjects, featIndicators));
      summary.projectsCount += featProjects.length;
      summary.indicatorsCount += featIndicators.length;
    }
  }

  if (ctx.indicatorSlugs?.length) {
    const indicators = ctx.indicatorSlugs
      .map((s) => getIndicator(s))
      .filter((x): x is Indicator => Boolean(x));
    if (indicators.length > 0) {
      blocks.push(formatIndicatorsContext(indicators));
      summary.indicatorsCount += indicators.length;
      for (const ind of indicators) {
        summary.evidenceCount += ind.sources?.length ?? 0;
      }
    }
  }

  return { block: blocks.length > 0 ? blocks.join("\n\n---\n\n") : null, summary };
}

/** Wrap a user question with an optional context block (shared by both ask routes). */
export function buildAskUserMessage(question: string, block: string | null): string {
  return block
    ? ["## Provided context", block, "", "## Question", question].join("\n")
    : question;
}
