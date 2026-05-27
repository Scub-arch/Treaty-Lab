import projectsJson from "@/content/projects.json";
import evidenceJson from "@/content/evidence.json";
import indicatorsJson from "@/content/indicators.json";
import explainersJson from "@/content/explainers.json";
import modulesJson from "@/content/modules.json";
import type {
  Domain,
  EvidenceItem,
  Indicator,
  ModuleConfig,
  PlainLanguageExplainer,
  ProjectAssessment,
} from "@/lib/content/types";

const projects = projectsJson.projects as unknown as ProjectAssessment[];
const evidence = evidenceJson.items as unknown as EvidenceItem[];
const indicators = indicatorsJson.indicators as unknown as Indicator[];
const explainers = explainersJson.explainers as unknown as PlainLanguageExplainer[];
const modules = modulesJson.modules as unknown as ModuleConfig[];

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
  return slugs.map((s) => indicators.find((i) => i.slug === s)).filter((x): x is Indicator => Boolean(x));
}

/** Resolve a list of project slugs to populated project objects. */
export function resolveProjects(slugs: string[]): ProjectAssessment[] {
  return slugs.map((s) => projects.find((p) => p.slug === s)).filter((x): x is ProjectAssessment => Boolean(x));
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
