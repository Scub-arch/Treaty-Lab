/**
 * Aggregation + group-by helpers for the Treaty-Lab content store.
 *
 * The existing loaders in `src/lib/content.ts` provide single-record lookups
 * and simple filters (`getEvidenceByTag`, `getProjectsByDomain`). This module
 * adds the aggregation primitives needed by analytics views, dashboard tiles,
 * filter dropdowns, and reports — operating on the multi-valued array fields
 * (`tags[]`, `domains[]`) and the categorical enum fields
 * (`sourceType`, `reliability`, `severity`, `trend`, `kind`).
 *
 * All functions are pure — no side effects, no I/O. Pass them the already-
 * loaded record arrays from `getEvidence()` / `getIndicators()` / etc.
 */

import type {
  Claim,
  Domain,
  EvidenceItem,
  EvidenceStrength,
  Indicator,
  PlainLanguageExplainer,
  ProjectAssessment,
  Severity,
  SourceType,
  Trend,
} from "@/lib/content/types";

// ---------------------------------------------------------------------------
// Citation-graph helpers (project x evidence cross-reference)
// ---------------------------------------------------------------------------

/**
 * Walk every citation surface on a project (primarySources, claim sources,
 * finance.sources) and return a Counter of how many citations land on each
 * source-type tier. Dangling references (slug not in evidenceBySlug) are
 * silently skipped — use `validateContent()` from `./validators.ts` to surface
 * them as errors.
 *
 * Used by the per-project citation chart on /projects.
 */
export function projectCitationsBySourceType(
  project: ProjectAssessment,
  evidenceBySlug: Map<string, EvidenceItem>,
): Map<SourceType, number> {
  const counts = new Map<SourceType, number>();
  const slugs: string[] = [];

  for (const ref of project.primarySources) slugs.push(ref.evidenceSlug);
  for (const claim of [
    ...project.firstNationImplications,
    ...project.treatyAndWaterRisk,
    ...project.financeRisk,
  ]) {
    for (const ref of claim.sources ?? []) slugs.push(ref.evidenceSlug);
  }
  for (const ref of project.finance.sources ?? []) slugs.push(ref.evidenceSlug);

  for (const slug of slugs) {
    const ev = evidenceBySlug.get(slug);
    if (!ev) continue;
    counts.set(ev.sourceType, (counts.get(ev.sourceType) ?? 0) + 1);
  }
  return counts;
}

/** Build a Map<slug, EvidenceItem> from an evidence array — convenience for the helper above. */
export function evidenceMap(items: EvidenceItem[]): Map<string, EvidenceItem> {
  return new Map(items.map((e) => [e.slug, e]));
}

/**
 * One record per evidence item that is cited somewhere, with the total
 * citation count across every reference surface in the content store.
 */
export interface CitedEvidenceRecord {
  slug: string;
  title: string;
  sourceType: SourceType;
  reliability: EvidenceStrength;
  citations: number;
}

/**
 * Walk every cross-reference in projects + indicators + explainers, count
 * citations per evidence slug, drop dangling references (slug not in
 * evidenceBySlug), and return the top-N sorted by citation count descending.
 *
 * Used by the top-cited-evidence chart on /evidence.
 */
export function topCitedEvidence(
  projects: ProjectAssessment[],
  indicators: Indicator[],
  explainers: PlainLanguageExplainer[],
  evidenceBySlug: Map<string, EvidenceItem>,
  topN: number = 15,
): CitedEvidenceRecord[] {
  const counts = new Map<string, number>();
  const inc = (slug: string) => counts.set(slug, (counts.get(slug) ?? 0) + 1);

  for (const p of projects) {
    for (const ref of p.primarySources) inc(ref.evidenceSlug);
    for (const claim of [
      ...p.firstNationImplications,
      ...p.treatyAndWaterRisk,
      ...p.financeRisk,
    ]) {
      for (const ref of claim.sources ?? []) inc(ref.evidenceSlug);
    }
    for (const ref of p.finance.sources ?? []) inc(ref.evidenceSlug);
  }
  for (const i of indicators) {
    for (const ref of i.sources ?? []) inc(ref.evidenceSlug);
  }
  for (const e of explainers) {
    for (const slug of e.relatedEvidence ?? []) inc(slug);
  }

  const records: CitedEvidenceRecord[] = [];
  for (const [slug, n] of counts) {
    const ev = evidenceBySlug.get(slug);
    if (!ev) continue; // dangling reference — skip silently here; validator surfaces these
    records.push({
      slug: ev.slug,
      title: ev.title,
      sourceType: ev.sourceType,
      reliability: ev.reliability,
      citations: n,
    });
  }
  records.sort((a, b) => b.citations - a.citations);
  return records.slice(0, topN);
}

/**
 * Pivot evidence items into a counts matrix of source-type × reliability tier.
 * Used by the reliability heatmap on /sources.
 */
export function evidenceCountsBySourceTypeAndReliability(
  items: EvidenceItem[],
): Map<SourceType, Map<EvidenceStrength, number>> {
  const out = new Map<SourceType, Map<EvidenceStrength, number>>();
  for (const e of items) {
    let inner = out.get(e.sourceType);
    if (!inner) {
      inner = new Map();
      out.set(e.sourceType, inner);
    }
    inner.set(e.reliability, (inner.get(e.reliability) ?? 0) + 1);
  }
  return out;
}

/**
 * Sankey-ready flow data: source-type → project. Each link's `value` is the
 * total citation count from evidence items of that source type cited anywhere
 * in that project (primary sources, claim sources, finance sources).
 *
 * Used by the citation Sankey on /evidence.
 */
export interface SankeyNode {
  name: string;
  /** Discriminator for client-side rendering (color, label format). */
  kind: "sourceType" | "project";
  /** Total throughput at this node (sum of incoming or outgoing links). */
  value: number;
}

export interface SankeyLink {
  source: number; // index into nodes[]
  target: number;
  value: number;
  sourceType: SourceType;
  projectSlug: string;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export function sankeyEvidenceToProject(
  projects: ProjectAssessment[],
  evidenceBySlug: Map<string, EvidenceItem>,
): SankeyData {
  // Walk projects to count (sourceType, project) -> count
  const flow = new Map<string, { sourceType: SourceType; project: ProjectAssessment; count: number }>();

  const tally = (sourceType: SourceType, project: ProjectAssessment) => {
    const key = `${sourceType}|${project.slug}`;
    const ex = flow.get(key);
    if (ex) ex.count += 1;
    else flow.set(key, { sourceType, project, count: 1 });
  };

  for (const p of projects) {
    for (const ref of p.primarySources) {
      const ev = evidenceBySlug.get(ref.evidenceSlug);
      if (ev) tally(ev.sourceType, p);
    }
    for (const claim of [
      ...p.firstNationImplications,
      ...p.treatyAndWaterRisk,
      ...p.financeRisk,
    ]) {
      for (const ref of claim.sources ?? []) {
        const ev = evidenceBySlug.get(ref.evidenceSlug);
        if (ev) tally(ev.sourceType, p);
      }
    }
    for (const ref of p.finance.sources ?? []) {
      const ev = evidenceBySlug.get(ref.evidenceSlug);
      if (ev) tally(ev.sourceType, p);
    }
  }

  // Build a stable node index — source types FIRST (left side), projects SECOND (right side).
  const sourceTypesUsed: SourceType[] = [];
  const projectsUsed: ProjectAssessment[] = [];
  for (const { sourceType, project } of flow.values()) {
    if (!sourceTypesUsed.includes(sourceType)) sourceTypesUsed.push(sourceType);
    if (!projectsUsed.find((p) => p.slug === project.slug)) projectsUsed.push(project);
  }
  // Order projects by their slug so the layout is deterministic across renders
  projectsUsed.sort((a, b) => a.slug.localeCompare(b.slug));

  const stIndexBase = 0;
  const projIndexBase = sourceTypesUsed.length;

  const nodes: SankeyNode[] = [
    ...sourceTypesUsed.map((st): SankeyNode => ({ name: st, kind: "sourceType", value: 0 })),
    ...projectsUsed.map((p): SankeyNode => ({ name: p.shortName ?? p.name, kind: "project", value: 0 })),
  ];

  const links: SankeyLink[] = [];
  for (const { sourceType, project, count } of flow.values()) {
    const sIdx = stIndexBase + sourceTypesUsed.indexOf(sourceType);
    const tIdx = projIndexBase + projectsUsed.findIndex((p) => p.slug === project.slug);
    links.push({
      source: sIdx,
      target: tIdx,
      value: count,
      sourceType,
      projectSlug: project.slug,
    });
    nodes[sIdx].value += count;
    nodes[tIdx].value += count;
  }

  return { nodes, links };
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/** Group items by a key function. Returns a Map preserving insertion order. */
export function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = out.get(key);
    if (bucket) bucket.push(item);
    else out.set(key, [item]);
  }
  return out;
}

/** Count items by a key function. Returns Map<key, count> sorted by count desc. */
export function countBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, number> {
  const counts = new Map<K, number>();
  for (const item of items) {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  // Re-sort descending for predictable rendering
  return new Map([...counts.entries()].sort((a, b) => b[1] - a[1]));
}

/** Flatten an array-of-arrays field, then count occurrences. Useful for tags / domains. */
export function countByMultiValued<T, V>(items: T[], multiFn: (item: T) => V[]): Map<V, number> {
  const counts = new Map<V, number>();
  for (const item of items) {
    for (const value of multiFn(item)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return new Map([...counts.entries()].sort((a, b) => b[1] - a[1]));
}

/** Distinct values from a single-valued field. Preserves first-seen order. */
export function distinct<T, V>(items: T[], keyFn: (item: T) => V): V[] {
  const seen = new Set<V>();
  const out: V[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(key);
    }
  }
  return out;
}

/** Distinct values from a multi-valued (array) field. Preserves first-seen order. */
export function distinctMultiValued<T, V>(items: T[], multiFn: (item: T) => V[]): V[] {
  const seen = new Set<V>();
  const out: V[] = [];
  for (const item of items) {
    for (const v of multiFn(item)) {
      if (!seen.has(v)) {
        seen.add(v);
        out.push(v);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Evidence aggregations
// ---------------------------------------------------------------------------

export function distinctTags(evidence: EvidenceItem[]): string[] {
  return distinctMultiValued(evidence, (e) => e.tags);
}

export function countByTag(evidence: EvidenceItem[]): Map<string, number> {
  return countByMultiValued(evidence, (e) => e.tags);
}

export function countBySourceType(evidence: EvidenceItem[]): Map<SourceType, number> {
  return countBy(evidence, (e) => e.sourceType);
}

export function countByReliability(evidence: EvidenceItem[]): Map<EvidenceStrength, number> {
  return countBy(evidence, (e) => e.reliability);
}

/** Group evidence items by reliability tier (preserves insertion order). */
export function evidenceByReliability(
  evidence: EvidenceItem[],
): Map<EvidenceStrength, EvidenceItem[]> {
  return groupBy(evidence, (e) => e.reliability);
}

// ---------------------------------------------------------------------------
// Indicator aggregations
// ---------------------------------------------------------------------------

export function countIndicatorsByDomain(indicators: Indicator[]): Map<Domain, number> {
  return countBy(indicators, (i) => i.domain);
}

export function countBySeverity(indicators: Indicator[]): Map<Severity, number> {
  return countBy(indicators, (i) => i.severity);
}

export function countByTrend(indicators: Indicator[]): Map<Trend, number> {
  return countBy(indicators, (i) => i.trend);
}

/**
 * Sum of severity-rank across indicators in a domain — the "cross-domain
 * composite severity" computation used by the Command Center radar chart.
 * Ranks: low=1, moderate=2, elevated=3, high=4, critical=5.
 * Returns the rank average per domain.
 */
const SEVERITY_RANK: Record<Severity, number> = {
  low: 1,
  moderate: 2,
  elevated: 3,
  high: 4,
  critical: 5,
};

export function averageSeverityByDomain(indicators: Indicator[]): Map<Domain, number> {
  const grouped = groupBy(indicators, (i) => i.domain);
  const out = new Map<Domain, number>();
  for (const [domain, items] of grouped) {
    const sum = items.reduce((acc, i) => acc + SEVERITY_RANK[i.severity], 0);
    out.set(domain, sum / items.length);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Project aggregations
// ---------------------------------------------------------------------------

export function countProjectsByDomain(projects: ProjectAssessment[]): Map<Domain, number> {
  return countByMultiValued(projects, (p) => p.domains);
}

/**
 * Projects that span all 5 domains (the cross-cutting ones). The current
 * pilot set has all 4 projects spanning all 4 represented domains; this
 * helper surfaces that pattern programmatically.
 */
export function projectsAcrossDomains(
  projects: ProjectAssessment[],
  domains: Domain[] = ["treaty", "water", "energy", "finance", "governance"],
): ProjectAssessment[] {
  return projects.filter((p) => domains.every((d) => p.domains.includes(d)));
}

// ---------------------------------------------------------------------------
// Claim aggregations
// ---------------------------------------------------------------------------

export type ClaimKind = Claim["kind"];

/** Group claims by their kind (fact / risk / question / assumption / needs_validation). */
export function claimsByKind(claims: Claim[]): Map<ClaimKind, Claim[]> {
  return groupBy(claims, (c) => c.kind);
}

/** Count claims by kind. Returns Map<kind, count>. */
export function countClaimsByKind(claims: Claim[]): Map<ClaimKind, number> {
  return countBy(claims, (c) => c.kind);
}

/**
 * For a project, collect all claims across the three claim arrays
 * (firstNationImplications + treatyAndWaterRisk + financeRisk) into one list.
 */
export function allClaimsForProject(project: ProjectAssessment): Claim[] {
  return [
    ...project.firstNationImplications,
    ...project.treatyAndWaterRisk,
    ...project.financeRisk,
  ];
}

/** Count claims by kind across an entire set of projects. */
export function countClaimsByKindAcrossProjects(
  projects: ProjectAssessment[],
): Map<ClaimKind, number> {
  return countBy(
    projects.flatMap((p) => allClaimsForProject(p)),
    (c) => c.kind,
  );
}
