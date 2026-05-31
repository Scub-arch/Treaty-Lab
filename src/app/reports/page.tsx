import type { Metadata } from "next";
import Link from "next/link";
import {
  getProjects,
  getEvidence,
  getIndicators,
  getExplainers,
  evidenceMap,
  topCitedEvidence,
  projectCitationsBySourceType,
  evidenceCountsBySourceTypeAndReliability,
  type CitedEvidenceRecord,
} from "@/lib/content";
import type { EvidenceStrength, SourceType } from "@/lib/content/types";
import {
  PerProjectCitationChart,
  type CitationChartRow,
} from "@/components/intel/per-project-citation-chart";
import { TopCitedEvidenceChart } from "@/components/intel/top-cited-evidence-chart";
import { SourceReliabilityHeatmap } from "@/components/intel/source-reliability-heatmap";

export const metadata: Metadata = { title: "Cross-Reference Reports — Treaty-Lab" };

const TOP_N = 15;
const SOURCE_TYPE_ORDER: SourceType[] = [
  "government_report",
  "court_decision",
  "legislation",
  "regulatory_filing",
  "academic",
  "news",
  "corporate_disclosure",
  "treaty_text",
  "ngo_report",
  "financial_prospectus",
];
const RELIABILITY_COL_ORDER: EvidenceStrength[] = ["weak", "moderate", "strong", "established"];

// RPT-001 — live evidence cross-reference reports. Replaces the static-PNG page;
// every figure is computed server-side at request time from the content store
// (the same helpers that power /evidence, /projects, and /sources), so the
// charts never go stale and there are no image exports to regenerate.
export default async function ReportsPage() {
  const projects = getProjects();
  const evidence = getEvidence();
  const evBySlug = evidenceMap(evidence);

  // (1) Top-cited evidence across every citation surface — top 15 by count.
  const topCited: CitedEvidenceRecord[] = topCitedEvidence(
    projects,
    getIndicators(),
    getExplainers(),
    evBySlug,
    TOP_N,
  );

  // (2) Source-type × reliability-tier pivot.
  const totalItems = evidence.length;
  const reliabilityPivot = evidenceCountsBySourceTypeAndReliability(evidence);
  const presentReliability: EvidenceStrength[] = RELIABILITY_COL_ORDER.filter((rel) =>
    [...reliabilityPivot.values()].some((inner) => (inner.get(rel) ?? 0) > 0),
  );
  const heatmapRows = [...reliabilityPivot.entries()]
    .map(([sourceType, inner]) => {
      const reliabilityCounts = presentReliability.map((rel) => ({
        reliability: rel,
        count: inner.get(rel) ?? 0,
      }));
      const rowTotal = reliabilityCounts.reduce((acc, c) => acc + c.count, 0);
      return { sourceType: sourceType as SourceType, reliabilityCounts, rowTotal };
    })
    .sort((a, b) => b.rowTotal - a.rowTotal)
    .map(({ sourceType, reliabilityCounts }) => ({ sourceType, reliabilityCounts }));

  // (3) Per-project citation footprint by source type.
  const rawRows: CitationChartRow[] = projects.map((p) => {
    const counts = projectCitationsBySourceType(p, evBySlug);
    const row: CitationChartRow = { project: p.shortName ?? p.name, total: 0 };
    let total = 0;
    for (const st of SOURCE_TYPE_ORDER) {
      const n = counts.get(st) ?? 0;
      if (n > 0) {
        row[st] = n;
        total += n;
      }
    }
    row.total = total;
    return row;
  });
  const chartRows = [...rawRows].sort((a, b) => a.total - b.total);
  const presentTypes: SourceType[] = SOURCE_TYPE_ORDER.filter((st) =>
    chartRows.some((r) => (r[st] as number | undefined) !== undefined && (r[st] as number) > 0),
  );

  return (
    <div className="px-6 py-8 space-y-10 max-w-[1400px] mx-auto">
      <section>
        <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-3">
          RPT · INDEX
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
          Cross-Reference Reports
        </h1>
        <p className="text-base text-muted-foreground mt-3 max-w-3xl leading-relaxed">
          Live evidence cross-reference charts, rendered server-side on every request from the same
          content store as{" "}
          <Link href="/evidence" className="underline underline-offset-2 hover:text-foreground">
            /evidence
          </Link>
          ,{" "}
          <Link href="/projects" className="underline underline-offset-2 hover:text-foreground">
            /projects
          </Link>
          , and{" "}
          <Link href="/sources" className="underline underline-offset-2 hover:text-foreground">
            /sources
          </Link>
          . They update automatically as the content store changes — no static exports.
        </p>
      </section>

      <ReportCard
        code="RPT · 01 — TOP CITED"
        title="Top 15 most-cited evidence items"
        description="Evidence items cited most often across project assessments, indicators, and explainers; bars coloured by source type."
      >
        <TopCitedEvidenceChart records={topCited} />
      </ReportCard>

      <ReportCard
        code="RPT · 02 — RELIABILITY MATRIX"
        title="Source type × reliability tier"
        description="Counts of evidence items pivoted by source type and reliability tier across the whole library."
      >
        <SourceReliabilityHeatmap
          counts={heatmapRows}
          reliabilityColumns={presentReliability}
          total={totalItems}
        />
      </ReportCard>

      <ReportCard
        code="RPT · 03 — EVIDENCE FOOTPRINT"
        title="Per-project citation footprint by source type"
        description="Each pilot project's evidence trail, stacked by source type; densest assessment at the top."
      >
        <PerProjectCitationChart rows={chartRows} presentTypes={presentTypes} />
      </ReportCard>

      {/* Methodology */}
      <section>
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mb-3">
          RPT · METHODOLOGY
        </div>
        <article className="border border-border rounded-md bg-card overflow-hidden">
          <header className="px-5 pt-4 pb-3 border-b border-border/60">
            <h2 className="text-base md:text-lg font-semibold tracking-tight">
              How these charts are computed
            </h2>
          </header>
          <div className="px-5 py-4 text-xs text-muted-foreground leading-relaxed space-y-3 max-w-3xl">
            <p>
              <span className="font-mono text-foreground/80">RPT · 01</span> — Top cited:{" "}
              <code className="font-mono text-foreground/80">topCitedEvidence</code> walks every
              citation surface (project primary sources, per-claim sources, project finance sources,
              indicator sources, explainer related-evidence), counts citations per evidence slug via
              an <code className="font-mono text-foreground/80">evidenceMap</code> lookup (dangling
              slugs dropped), and returns the top {TOP_N} by count descending.
            </p>
            <p>
              <span className="font-mono text-foreground/80">RPT · 02</span> — Reliability matrix:{" "}
              <code className="font-mono text-foreground/80">
                evidenceCountsBySourceTypeAndReliability
              </code>{" "}
              pivots all evidence into a source-type × reliability-tier count map; only tiers
              present in the data are shown, and source-type rows are sorted by row total
              descending.
            </p>
            <p>
              <span className="font-mono text-foreground/80">RPT · 03</span> — Evidence footprint:
              for each project,{" "}
              <code className="font-mono text-foreground/80">projectCitationsBySourceType</code>{" "}
              counts citations by source type; rows are sorted ascending by total so the densest
              project sits at the top, and only source types with non-zero data render as stacks.
            </p>
            <p className="pt-2 border-t border-border/60">
              All figures are derived at request time from{" "}
              <code className="font-mono text-foreground/80">src/content/*.json</code> (via Prisma)
              by the same helpers that power /evidence, /projects, and /sources — there are no
              static image exports.
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}

function ReportCard({
  code,
  title,
  description,
  children,
}: {
  code: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mb-3">
        {code}
      </div>
      <article className="border border-border rounded-md bg-card overflow-hidden">
        <header className="px-5 pt-4 pb-3 border-b border-border/60">
          <h2 className="text-base md:text-lg font-semibold tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-3xl leading-relaxed">
            {description}
          </p>
        </header>
        <div className="px-5 py-4">{children}</div>
      </article>
    </section>
  );
}
