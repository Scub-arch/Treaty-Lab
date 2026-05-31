// DATA-001 (PR-2): the five content collections are now read from Prisma
// instead of the JSON files. The JSON stays the seed corpus (see prisma/seed.ts);
// runtime reads come from the database. The public getter API below is unchanged
// and stays synchronous: we load + reshape every collection once via a top-level
// `await`, into the same in-memory arrays the getters already served. This keeps
// all 31 consumers (incl. generateStaticParams / aggregations) byte-identical.
//
// Server-only: this module imports the Prisma client. It must never be pulled
// into a client bundle (no "use client" file imports from "@/lib/content").
import { prisma } from "@/lib/db";
import type {
  Claim,
  Domain,
  EvidenceItem,
  EvidenceStrength,
  Indicator,
  ModuleConfig,
  PlainLanguageExplainer,
  ProjectAssessment,
  ProjectStatus,
  Severity,
  SourceReference,
  SourceType,
  Trend,
} from "@/lib/content/types";

/** Collapse a citation-join row set (each with `citing` + related evidence slug) back to SourceReference[]. */
function toSourceRefs(rows: { citing: string; evidence: { slug: string } }[]): SourceReference[] {
  return rows.map((r) => ({ evidenceSlug: r.evidence.slug, citing: r.citing }));
}

async function loadContent(): Promise<{
  evidence: EvidenceItem[];
  indicators: Indicator[];
  projects: ProjectAssessment[];
  explainers: PlainLanguageExplainer[];
  modules: ModuleConfig[];
}> {
  const evidenceSlug = { evidence: { select: { slug: true } } } as const;

  const [evRows, indRows, projRows, explRows, modRows] = await Promise.all([
    prisma.evidenceItem.findMany(),
    prisma.indicator.findMany({
      include: { sources: { include: evidenceSlug, orderBy: { order: "asc" } } },
    }),
    prisma.projectAssessment.findMany({
      include: {
        parties: { orderBy: { order: "asc" } },
        claims: {
          include: { sources: { include: evidenceSlug, orderBy: { order: "asc" } } },
          orderBy: { order: "asc" },
        },
        primarySources: { include: evidenceSlug, orderBy: { order: "asc" } },
        finance: { include: { sources: { include: evidenceSlug, orderBy: { order: "asc" } } } },
        relatedTreaties: {
          select: { slug: true, name: true, shortName: true },
          orderBy: { openedAt: "asc" },
        },
      },
    }),
    prisma.plainLanguageExplainer.findMany({
      include: {
        relatedEvidence: { include: evidenceSlug, orderBy: { order: "asc" } },
        relatedProjects: {
          include: { project: { select: { slug: true } } },
          orderBy: { order: "asc" },
        },
      },
    }),
    prisma.moduleConfig.findMany({
      include: {
        featuredIndicators: {
          include: { indicator: { select: { slug: true } } },
          orderBy: { order: "asc" },
        },
        featuredProjects: {
          include: { project: { select: { slug: true } } },
          orderBy: { order: "asc" },
        },
      },
    }),
  ]);

  const evidence: EvidenceItem[] = evRows.map((e) => ({
    slug: e.slug,
    title: e.title,
    sourceType: e.sourceType as SourceType,
    author: e.author ?? undefined,
    publishedAt: e.publishedAt ?? undefined,
    url: e.url ?? undefined,
    citation: e.citation ?? undefined,
    reliability: e.reliability as EvidenceStrength,
    tags: e.tags as string[],
    supports: e.supports as string[],
    limitations: (e.limitations as string[] | null) ?? undefined,
    plainSummary: e.plainSummary,
  }));

  const indicators: Indicator[] = indRows.map((i) => ({
    slug: i.slug,
    domain: i.domain as Domain,
    name: i.name,
    summary: i.summary,
    value: i.value,
    numericValue: i.numericValue ?? undefined,
    unit: i.unit ?? undefined,
    severity: i.severity as Severity,
    trend: i.trend as Trend,
    note: i.note ?? undefined,
    sources: toSourceRefs(i.sources),
    updatedAt: i.updatedAt,
  }));

  const projects: ProjectAssessment[] = projRows.map((p) => {
    const claimsOf = (group: string): Claim[] =>
      p.claims
        .filter((c) => c.group === group)
        .map((c) => ({
          text: c.text,
          kind: c.kind as Claim["kind"],
          sources: toSourceRefs(c.sources),
        }));
    if (!p.finance) throw new Error(`content: project "${p.slug}" is missing its finance record`);
    return {
      slug: p.slug,
      name: p.name,
      shortName: p.shortName ?? undefined,
      status: p.status as ProjectStatus,
      summary: p.summary,
      location: p.location,
      jurisdictions: p.jurisdictions as string[],
      proponent: p.proponent,
      governmentObjective: p.governmentObjective,
      proponentObjective: p.proponentObjective,
      parties: p.parties.map((pt) => ({
        name: pt.name,
        role: pt.role,
        statementUrl: pt.statementUrl ?? undefined,
      })),
      firstNationImplications: claimsOf("firstNationImplications"),
      treatyAndWaterRisk: claimsOf("treatyAndWaterRisk"),
      financeRisk: claimsOf("financeRisk"),
      governanceQuestions: p.governanceQuestions as string[],
      recommendedCommunityQuestions: p.recommendedCommunityQuestions as string[],
      finance: {
        structure: p.finance.structure,
        totalCostEstimate: p.finance.totalCostEstimate ?? undefined,
        costOverrunsNoted: p.finance.costOverrunsNoted ?? undefined,
        loanGuarantor: p.finance.loanGuarantor ?? undefined,
        riskCarrier: p.finance.riskCarrier,
        sources: toSourceRefs(p.finance.sources),
      },
      primarySources: toSourceRefs(p.primarySources),
      evidenceConfidence: p.evidenceConfidence as EvidenceStrength,
      domains: p.domains as Domain[],
      lastReviewed: p.lastReviewed,
      relatedTreaties: p.relatedTreaties.map((t) => ({
        slug: t.slug,
        name: t.name,
        shortName: t.shortName ?? undefined,
      })),
    };
  });

  const explainers: PlainLanguageExplainer[] = explRows.map((e) => ({
    slug: e.slug,
    question: e.question,
    shortAnswer: e.shortAnswer,
    body: e.body,
    relatedEvidence: e.relatedEvidence.map((r) => r.evidence.slug),
    relatedProjects: e.relatedProjects.map((r) => r.project.slug),
  }));

  const modules: ModuleConfig[] = modRows.map((m) => ({
    slug: m.slug as Domain,
    title: m.title,
    tagline: m.tagline,
    lede: m.lede,
    featuredIndicatorSlugs: m.featuredIndicators.map((r) => r.indicator.slug),
    featuredProjectSlugs: m.featuredProjects.map((r) => r.project.slug),
  }));

  return { evidence, indicators, projects, explainers, modules };
}

const { projects, evidence, indicators, explainers, modules } = await loadContent();

export function getProjects(): ProjectAssessment[] {
  return projects;
}

export function getProject(slug: string): ProjectAssessment | undefined {
  return projects.find((p) => p.slug === slug);
}

export function getProjectsByDomain(domain: Domain): ProjectAssessment[] {
  return projects.filter((p) => p.domains.includes(domain));
}

export function getEvidence(): EvidenceItem[] {
  return evidence;
}

export function getEvidenceItem(slug: string): EvidenceItem | undefined {
  return evidence.find((e) => e.slug === slug);
}

export function getEvidenceByTag(tag: string): EvidenceItem[] {
  return evidence.filter((e) => e.tags.includes(tag));
}

export function getIndicators(): Indicator[] {
  return indicators;
}

export function getIndicator(slug: string): Indicator | undefined {
  return indicators.find((i) => i.slug === slug);
}

export function getIndicatorsByDomain(domain: Domain): Indicator[] {
  return indicators.filter((i) => i.domain === domain);
}

export function getExplainers(): PlainLanguageExplainer[] {
  return explainers;
}

export function getExplainer(slug: string): PlainLanguageExplainer | undefined {
  return explainers.find((e) => e.slug === slug);
}

export function getModule(slug: Domain): ModuleConfig | undefined {
  return modules.find((m) => m.slug === slug);
}

export function getModules(): ModuleConfig[] {
  return modules;
}

/** Resolve a list of indicator slugs to populated indicator objects (preserving order, dropping unknowns). */
export function resolveIndicators(slugs: string[]): Indicator[] {
  return slugs
    .map((s) => indicators.find((i) => i.slug === s))
    .filter((x): x is Indicator => Boolean(x));
}

/** Resolve a list of project slugs to populated project objects. */
export function resolveProjects(slugs: string[]): ProjectAssessment[] {
  return slugs
    .map((s) => projects.find((p) => p.slug === s))
    .filter((x): x is ProjectAssessment => Boolean(x));
}

// Re-export cross-reference validators + aggregation helpers so the public
// content API is a single import surface. Implementation lives in
// `src/lib/content/validators.ts` and `src/lib/content/aggregations.ts`.
export {
  validateContent,
  assertSlugsPresent,
  formatValidationReport,
} from "@/lib/content/validators";
export type {
  ValidationCollection,
  ValidationError,
  ValidationResult,
} from "@/lib/content/validators";

export {
  groupBy,
  countBy,
  countByMultiValued,
  distinct,
  distinctMultiValued,
  distinctTags,
  countByTag,
  countBySourceType,
  countByReliability,
  evidenceByReliability,
  countIndicatorsByDomain,
  countBySeverity,
  countByTrend,
  averageSeverityByDomain,
  countProjectsByDomain,
  projectsAcrossDomains,
  claimsByKind,
  countClaimsByKind,
  allClaimsForProject,
  countClaimsByKindAcrossProjects,
  projectCitationsBySourceType,
  evidenceMap,
  topCitedEvidence,
  evidenceCountsBySourceTypeAndReliability,
  sankeyEvidenceToProject,
} from "@/lib/content/aggregations";
export type {
  CitedEvidenceRecord,
  SankeyData,
  SankeyNode,
  SankeyLink,
} from "@/lib/content/aggregations";
export type { ClaimKind } from "@/lib/content/aggregations";
