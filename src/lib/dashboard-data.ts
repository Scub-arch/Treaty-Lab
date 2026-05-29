/**
 * Data loaders for /dashboard. Server-only — DO NOT import from a client component.
 *
 * Three tab loaders:
 *   - getTreatiesTabData()  — Prisma (Treaty/Signature/Party/Topic) → KPIs + table + charts
 *   - getResourcesTabData() — content aggregations filtered to energy/water/finance
 *   - getEvidenceTabData()  — citation graph + reliability heatmap + project watchlist
 *
 * Plus getTreatyDetail(id) for the row-click side panel.
 *
 * Returns plain serializable shapes so the data can cross the server→client boundary
 * to recharts-using intel components without further marshalling.
 */

import { prisma } from "@/lib/db";
import {
  getEvidence,
  getExplainers,
  getIndicators,
  getProjects,
  evidenceMap,
  topCitedEvidence,
  sankeyEvidenceToProject,
  evidenceCountsBySourceTypeAndReliability,
  countBy,
  countByTrend,
} from "@/lib/content";
import type {
  Domain,
  EvidenceItem,
  EvidenceStrength,
  Indicator,
  ProjectAssessment,
  Severity,
  SourceType,
} from "@/lib/content/types";
import type { DomainComposite } from "@/components/intel/radar-overview";
import type { CitedEvidenceRecord, SankeyData } from "@/lib/content";

const SEVERITY_RANK: Record<Severity, number> = {
  low: 1,
  moderate: 2,
  elevated: 3,
  high: 4,
  critical: 5,
};

const DOMAIN_LABELS: Record<Domain, string> = {
  treaty: "Treaty",
  water: "Water",
  energy: "Energy",
  finance: "Finance",
  governance: "Governance",
};

// ===========================================================================
// Tab 1: Treaties (Prisma)
// ===========================================================================

export interface TreatyRow {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  openedAt: string; // ISO yyyy-mm-dd
  enteredIntoForceAt: string | null;
  depository: string | null;
  partyCount: number;
  ratifiedCount: number;
  topics: Array<{ slug: string; name: string }>;
}

export interface TreatyTimelinePoint {
  year: number;
  signed: number;
  ratified: number;
}

export interface PartyTypeSlice {
  type: string;
  count: number;
}

export interface TopicSlice {
  slug: string;
  name: string;
  treatyCount: number;
}

export interface TreatiesTabData {
  kpis: {
    totalTreaties: number;
    totalSignatures: number;
    treatiesInForce: number;
    uniqueParties: number;
  };
  rows: TreatyRow[];
  timeline: TreatyTimelinePoint[];
  partyTypes: PartyTypeSlice[];
  topicDistribution: TopicSlice[];
}

export async function getTreatiesTabData(): Promise<TreatiesTabData> {
  const treaties = await prisma.treaty.findMany({
    include: {
      signatures: true,
      topics: true,
    },
    orderBy: { openedAt: "asc" },
  });

  const [totalSignatures, uniqueParties] = await Promise.all([
    prisma.signature.count(),
    prisma.party.count(),
  ]);

  const rows: TreatyRow[] = treaties.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    shortName: t.shortName,
    openedAt: t.openedAt.toISOString().slice(0, 10),
    enteredIntoForceAt: t.enteredIntoForceAt?.toISOString().slice(0, 10) ?? null,
    depository: t.depository,
    partyCount: t.signatures.length,
    ratifiedCount: t.signatures.filter((s) => s.ratifiedAt != null).length,
    topics: t.topics.map((tp) => ({ slug: tp.slug, name: tp.name })),
  }));

  const treatiesInForce = treaties.filter((t) => t.enteredIntoForceAt != null).length;

  // Timeline: count signed vs ratified per year (using treaty.openedAt for signed;
  // signature.ratifiedAt for ratified). For a small numbered-treaty dataset this
  // gives a meaningful sparkline of treaty-making activity over a century+.
  const yearBuckets = new Map<number, { signed: number; ratified: number }>();
  const touch = (year: number) => {
    if (!yearBuckets.has(year)) yearBuckets.set(year, { signed: 0, ratified: 0 });
    return yearBuckets.get(year)!;
  };
  for (const t of treaties) {
    const y = t.openedAt.getUTCFullYear();
    touch(y).signed += 1;
  }
  // Pull ratifications across all signatures
  const allSigs = await prisma.signature.findMany({
    select: { ratifiedAt: true },
    where: { ratifiedAt: { not: null } },
  });
  for (const s of allSigs) {
    if (s.ratifiedAt) {
      const y = s.ratifiedAt.getUTCFullYear();
      touch(y).ratified += 1;
    }
  }
  const timeline: TreatyTimelinePoint[] = [...yearBuckets.entries()]
    .map(([year, v]) => ({ year, signed: v.signed, ratified: v.ratified }))
    .sort((a, b) => a.year - b.year);

  // Party type breakdown — note: counts parties, not signatures
  const partyTypeRows = await prisma.party.groupBy({
    by: ["type"],
    _count: { type: true },
  });
  const partyTypes: PartyTypeSlice[] = partyTypeRows
    .map((r) => ({ type: r.type, count: r._count.type }))
    .sort((a, b) => b.count - a.count);

  // Topic distribution — how many treaties touch each topic
  const topicRows = await prisma.topic.findMany({
    include: { treaties: { select: { id: true } } },
  });
  const topicDistribution: TopicSlice[] = topicRows
    .map((t) => ({ slug: t.slug, name: t.name, treatyCount: t.treaties.length }))
    .sort((a, b) => b.treatyCount - a.treatyCount);

  return {
    kpis: {
      totalTreaties: treaties.length,
      totalSignatures,
      treatiesInForce,
      uniqueParties,
    },
    rows,
    timeline,
    partyTypes,
    topicDistribution,
  };
}

export interface TreatyDetail {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  summary: string | null;
  depository: string | null;
  sourceUrl: string | null;
  openedAt: string;
  enteredIntoForceAt: string | null;
  topics: Array<{ slug: string; name: string }>;
  signatures: Array<{
    id: string;
    party: { code: string; name: string; type: string };
    signedAt: string | null;
    ratifiedAt: string | null;
    reservation: string | null;
  }>;
}

/**
 * Bulk-load every treaty's detail for the dashboard side panel. With only
 * ~12 treaties this is cheaper than round-tripping per row click. Returns
 * a plain record keyed by treaty id so it can serialize over the
 * server→client boundary.
 */
export async function getAllTreatyDetails(): Promise<Record<string, TreatyDetail>> {
  const treaties = await prisma.treaty.findMany({
    include: {
      topics: true,
      signatures: {
        include: { party: true },
        orderBy: [{ ratifiedAt: "asc" }, { signedAt: "asc" }],
      },
    },
  });
  const out: Record<string, TreatyDetail> = {};
  for (const t of treaties) {
    out[t.id] = {
      id: t.id,
      slug: t.slug,
      name: t.name,
      shortName: t.shortName,
      summary: t.summary,
      depository: t.depository,
      sourceUrl: t.sourceUrl,
      openedAt: t.openedAt.toISOString().slice(0, 10),
      enteredIntoForceAt: t.enteredIntoForceAt?.toISOString().slice(0, 10) ?? null,
      topics: t.topics.map((tp) => ({ slug: tp.slug, name: tp.name })),
      signatures: t.signatures.map((s) => ({
        id: s.id,
        party: { code: s.party.code, name: s.party.name, type: s.party.type },
        signedAt: s.signedAt?.toISOString().slice(0, 10) ?? null,
        ratifiedAt: s.ratifiedAt?.toISOString().slice(0, 10) ?? null,
        reservation: s.reservation,
      })),
    };
  }
  return out;
}

export async function getTreatyDetail(id: string): Promise<TreatyDetail | null> {
  const t = await prisma.treaty.findUnique({
    where: { id },
    include: {
      topics: true,
      signatures: {
        include: { party: true },
        orderBy: [{ ratifiedAt: "asc" }, { signedAt: "asc" }],
      },
    },
  });
  if (!t) return null;
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    shortName: t.shortName,
    summary: t.summary,
    depository: t.depository,
    sourceUrl: t.sourceUrl,
    openedAt: t.openedAt.toISOString().slice(0, 10),
    enteredIntoForceAt: t.enteredIntoForceAt?.toISOString().slice(0, 10) ?? null,
    topics: t.topics.map((tp) => ({ slug: tp.slug, name: tp.name })),
    signatures: t.signatures.map((s) => ({
      id: s.id,
      party: { code: s.party.code, name: s.party.name, type: s.party.type },
      signedAt: s.signedAt?.toISOString().slice(0, 10) ?? null,
      ratifiedAt: s.ratifiedAt?.toISOString().slice(0, 10) ?? null,
      reservation: s.reservation,
    })),
  };
}

// ===========================================================================
// Tab 2: Resources (energy + water + finance content aggregations)
// ===========================================================================

const RESOURCE_DOMAINS: Domain[] = ["energy", "water", "finance"];

export interface IndicatorRow {
  slug: string;
  name: string;
  domain: Domain;
  domainLabel: string;
  value: string;
  severity: Severity;
  trend: string;
  summary: string;
  updatedAt: string;
}

export interface SeveritySlice {
  severity: Severity;
  count: number;
}

export interface TrendSlice {
  trend: string;
  count: number;
}

export interface ResourcesTabData {
  kpis: {
    indicatorCount: number;
    criticalOrHigh: number;
    deterioratingCount: number;
    crossDomainProjects: number;
  };
  composites: DomainComposite[]; // for RadarOverview
  rows: IndicatorRow[];
  severityBreakdown: SeveritySlice[];
  trendBreakdown: TrendSlice[];
}

export function getResourcesTabData(): ResourcesTabData {
  const indicators = getIndicators();
  const projects = getProjects();

  const resourceIndicators = indicators.filter((i) => RESOURCE_DOMAINS.includes(i.domain));

  const composites: DomainComposite[] = RESOURCE_DOMAINS.map((domain) => {
    const inDomain = resourceIndicators.filter((i) => i.domain === domain);
    const score = inDomain.length
      ? inDomain.reduce((sum, i) => sum + SEVERITY_RANK[i.severity], 0) / inDomain.length
      : 0;
    return {
      domain,
      label: DOMAIN_LABELS[domain],
      severityScore: Number(score.toFixed(2)),
      indicatorCount: inDomain.length,
    };
  });

  const rows: IndicatorRow[] = resourceIndicators
    .slice()
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
    .map((i) => ({
      slug: i.slug,
      name: i.name,
      domain: i.domain,
      domainLabel: DOMAIN_LABELS[i.domain],
      value: i.value,
      severity: i.severity,
      trend: i.trend,
      summary: i.summary,
      updatedAt: i.updatedAt,
    }));

  const severityBreakdown: SeveritySlice[] = [
    ...countBy(resourceIndicators, (i: Indicator) => i.severity).entries(),
  ].map(([severity, count]) => ({ severity, count }));

  const trendBreakdown: TrendSlice[] = [...countByTrend(resourceIndicators).entries()].map(
    ([trend, count]) => ({ trend, count }),
  );

  const crossDomainProjects = projects.filter((p) =>
    RESOURCE_DOMAINS.every((d) => p.domains.includes(d)),
  ).length;

  return {
    kpis: {
      indicatorCount: resourceIndicators.length,
      criticalOrHigh: resourceIndicators.filter(
        (i) => i.severity === "critical" || i.severity === "high",
      ).length,
      deterioratingCount: resourceIndicators.filter((i) => i.trend === "deteriorating").length,
      crossDomainProjects,
    },
    composites,
    rows,
    severityBreakdown,
    trendBreakdown,
  };
}

// ===========================================================================
// Tab 3: Evidence + Projects
// ===========================================================================

const RELIABILITY_ORDER: EvidenceStrength[] = ["weak", "moderate", "strong", "established"];

export interface ReliabilityHeatmapData {
  counts: Array<{
    sourceType: SourceType;
    reliabilityCounts: Array<{ reliability: EvidenceStrength; count: number }>;
  }>;
  reliabilityColumns: EvidenceStrength[];
  total: number;
}

export interface EvidenceTabData {
  kpis: {
    totalEvidence: number;
    totalCitations: number;
    establishedReliabilityCount: number;
    projectsPendingValidation: number;
  };
  topCited: CitedEvidenceRecord[];
  sankey: SankeyData;
  heatmap: ReliabilityHeatmapData;
  projects: ProjectAssessment[];
  sourceTypeBreakdown: Array<{ sourceType: SourceType; count: number }>;
}

export function getEvidenceTabData(): EvidenceTabData {
  const evidence: EvidenceItem[] = getEvidence();
  const indicators = getIndicators();
  const projects = getProjects();

  const explainers = getExplainers();

  const evMap = evidenceMap(evidence);
  const topCited = topCitedEvidence(projects, indicators, explainers, evMap, 15);

  // topCited only covers the top 15 — recompute full citation total for the KPI.
  let fullCitationCount = 0;
  for (const p of projects) {
    fullCitationCount += p.primarySources.length;
    for (const claim of [...p.firstNationImplications, ...p.treatyAndWaterRisk, ...p.financeRisk]) {
      fullCitationCount += claim.sources?.length ?? 0;
    }
    fullCitationCount += p.finance.sources?.length ?? 0;
  }
  for (const i of indicators) fullCitationCount += i.sources?.length ?? 0;
  for (const e of explainers) fullCitationCount += e.relatedEvidence?.length ?? 0;

  const sankey = sankeyEvidenceToProject(projects, evMap);

  // Heatmap: pivot helper returns Map<SourceType, Map<EvidenceStrength, number>>;
  // SourceReliabilityHeatmap wants a flatter shape.
  const heatmapRaw = evidenceCountsBySourceTypeAndReliability(evidence);
  const counts: ReliabilityHeatmapData["counts"] = [...heatmapRaw.entries()].map(
    ([sourceType, inner]) => ({
      sourceType,
      reliabilityCounts: RELIABILITY_ORDER.map((reliability) => ({
        reliability,
        count: inner.get(reliability) ?? 0,
      })),
    }),
  );
  // Order rows by total count desc for readability
  counts.sort((a, b) => {
    const sumA = a.reliabilityCounts.reduce((s, r) => s + r.count, 0);
    const sumB = b.reliabilityCounts.reduce((s, r) => s + r.count, 0);
    return sumB - sumA;
  });

  const sourceTypeBreakdown = [
    ...countBy(evidence, (e: EvidenceItem) => e.sourceType).entries(),
  ].map(([sourceType, count]) => ({ sourceType, count }));

  // projectsPendingValidation: projects that have at least one needs_validation claim
  const projectsPendingValidation = projects.filter((p) => {
    const claims = [...p.firstNationImplications, ...p.treatyAndWaterRisk, ...p.financeRisk];
    return claims.some((c) => c.kind === "needs_validation");
  }).length;

  return {
    kpis: {
      totalEvidence: evidence.length,
      totalCitations: fullCitationCount,
      establishedReliabilityCount: evidence.filter((e) => e.reliability === "established").length,
      projectsPendingValidation,
    },
    topCited,
    sankey,
    heatmap: {
      counts,
      reliabilityColumns: RELIABILITY_ORDER,
      total: evidence.length,
    },
    projects,
    sourceTypeBreakdown,
  };
}
