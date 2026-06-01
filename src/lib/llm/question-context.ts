/**
 * Shared server-side context builder for the decision-question generator
 * (AI-005/006/007). Surfaces the project's open items — the richest source of
 * good decision questions. Server-only (reads content), so it is kept out of
 * the pure, client-safe `question-generator.ts`. Used by both the blocking
 * (/api/questions) and streaming (/api/questions/stream) routes.
 */

import { allClaimsForProject } from "@/lib/content";
import type { ProjectAssessment } from "@/lib/content/types";

export interface ProjectContext {
  context: string;
  summary: { claimsCount: number; openItemsCount: number; evidenceCount: number };
}

export function buildProjectContext(p: ProjectAssessment): ProjectContext {
  const claims = allClaimsForProject(p);
  const openKinds = new Set(["risk", "question", "assumption", "needs_validation"]);
  const openItemsCount = claims.filter((c) => openKinds.has(c.kind)).length;

  const claimLines = claims
    .map(
      (c) =>
        `- [${c.kind.toUpperCase()}] ${c.text}${
          c.sources?.length ? ` (sources: ${c.sources.map((s) => s.evidenceSlug).join(", ")})` : ""
        }`,
    )
    .join("\n");

  const parties = p.parties.map((party) => `- ${party.name} — ${party.role}`).join("\n");

  const context = [
    `### ${p.name} (${p.slug})`,
    `Status: ${p.status} · Location: ${p.location} · Jurisdictions: ${p.jurisdictions.join(", ")}`,
    `Proponent: ${p.proponent}`,
    `Summary: ${p.summary}`,
    `Government objective: ${p.governmentObjective}`,
    `Proponent objective: ${p.proponentObjective}`,
    `Evidence confidence in this assessment: ${p.evidenceConfidence}`,
    "",
    "Parties:",
    parties,
    "",
    "Claims (separated by kind — QUESTION / NEEDS_VALIDATION / ASSUMPTION are open items):",
    claimLines,
    "",
    `Finance structure: ${p.finance.structure}`,
    p.finance.totalCostEstimate ? `Cost estimate: ${p.finance.totalCostEstimate}` : "",
    `Who carries residual risk: ${p.finance.riskCarrier}`,
    "",
    p.governanceQuestions.length
      ? `Already-noted governance questions:\n${p.governanceQuestions.map((q) => `- ${q}`).join("\n")}`
      : "",
    p.recommendedCommunityQuestions.length
      ? `Already-noted community questions (extend these, do not repeat):\n${p.recommendedCommunityQuestions
          .map((q) => `- ${q}`)
          .join("\n")}`
      : "",
    "",
    `Primary sources: ${p.primarySources.map((s) => `${s.evidenceSlug} — ${s.citing}`).join("; ")}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    context,
    summary: {
      claimsCount: claims.length,
      openItemsCount,
      evidenceCount: p.primarySources.length,
    },
  };
}
