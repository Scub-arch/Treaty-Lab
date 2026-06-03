// AI-001b — pure unit test for the shared ask-context formatters in
// src/lib/llm/context.ts (no DB, no server). Asserts the canonical richer
// project formatting and the shared message builder. Run:
//   npx tsx tests/llm-context.audit.ts
import {
  formatProjectContext,
  buildContextBlock,
  buildAskUserMessage,
} from "../src/lib/llm/context";
import type { ProjectAssessment } from "../src/lib/content/types";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

/** Minimal valid ProjectAssessment; override individual fields per case. */
function projectFixture(overrides: Partial<ProjectAssessment> = {}): ProjectAssessment {
  return {
    slug: "demo-project",
    name: "Demo Project",
    status: "in_review",
    summary: "A demo project for testing context formatting.",
    location: "British Columbia",
    jurisdictions: ["British Columbia", "Federal Canada"],
    proponent: "Demo Proponent Corp",
    governmentObjective: "Advance the public policy aim.",
    proponentObjective: "Deliver the project profitably.",
    parties: [],
    firstNationImplications: [{ text: "Consultation is ongoing.", kind: "fact" }],
    treatyAndWaterRisk: [],
    financeRisk: [],
    governanceQuestions: [],
    recommendedCommunityQuestions: [],
    finance: {
      structure: "Federal Crown corporation",
      totalCostEstimate: "$1.2B",
      riskCarrier: "Federal Crown",
    },
    primarySources: [{ evidenceSlug: "ev-001", citing: "project filing" }],
    evidenceConfidence: "moderate",
    domains: ["finance"],
    lastReviewed: "2026-01-01",
    ...overrides,
  };
}

function main(): void {
  // Canonical (richer) project context includes objectives, finance, primary
  // sources, and the aggregated claims.
  const out = formatProjectContext(projectFixture());
  assert(out.includes("Government objective:"), "missing government objective");
  assert(out.includes("Proponent objective:"), "missing proponent objective");
  assert(out.includes("Finance structure:"), "missing finance structure");
  assert(out.includes("Cost estimate: $1.2B"), "missing cost estimate when present");
  assert(out.includes("Primary sources:"), "missing primary sources");
  assert(out.includes("ev-001"), "missing primary source slug");
  assert(out.includes("Consultation is ongoing."), "missing aggregated claim");

  // Missing optional finance fields must not crash or emit the empty line.
  const noCost = formatProjectContext(
    projectFixture({ finance: { structure: "Equity", riskCarrier: "Sponsors" } }),
  );
  assert(!noCost.includes("Cost estimate:"), "should omit cost estimate when absent");
  assert(noCost.includes("Finance structure: Equity"), "finance structure still present");

  // No selection → null block + zeroed summary (no content/DB access).
  const empty = buildContextBlock(undefined);
  assert(empty.block === null, "undefined ctx must yield null block");
  assert(
    empty.summary.projectsCount === 0 &&
      empty.summary.indicatorsCount === 0 &&
      empty.summary.evidenceCount === 0,
    "undefined ctx must yield a zeroed summary",
  );

  // Shared user-message assembly is stable for both ask routes.
  assert(buildAskUserMessage("Q", null) === "Q", "no block → bare question");
  const wrapped = buildAskUserMessage("Q", "BLOCK");
  assert(wrapped.includes("## Provided context"), "wrapped missing context header");
  assert(wrapped.includes("## Question"), "wrapped missing question header");
  assert(wrapped.includes("BLOCK") && wrapped.includes("Q"), "wrapped missing parts");

  console.log("LLM_CONTEXT_OK");
}

main();
