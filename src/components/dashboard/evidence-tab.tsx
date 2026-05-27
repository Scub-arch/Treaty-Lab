import { Library, Quote, ShieldCheck, AlertTriangle } from "lucide-react";
import { IntelligencePanel } from "@/components/intel/intelligence-panel";
import { CitationSankey } from "@/components/intel/citation-sankey";
import { TopCitedEvidenceChart } from "@/components/intel/top-cited-evidence-chart";
import { SourceReliabilityHeatmap } from "@/components/intel/source-reliability-heatmap";
import { WatchlistTable } from "@/components/intel/watchlist-table";
import { KpiCard } from "./kpi-card";
import type { EvidenceTabData } from "@/lib/dashboard-data";

interface Props {
  data: EvidenceTabData;
}

export function EvidenceTab({ data }: Props) {
  const { kpis, topCited, sankey, heatmap, projects } = data;
  const establishedPct = kpis.totalEvidence
    ? Math.round((kpis.establishedReliabilityCount / kpis.totalEvidence) * 100)
    : 0;
  return (
    <div className="space-y-6">
      <section>
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mb-3">
          EVD · OVERVIEW
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            code="EVD · 01"
            label="Evidence items"
            value={kpis.totalEvidence}
            sublabel="Public-record sources catalogued"
            icon={Library}
          />
          <KpiCard
            code="EVD · 02"
            label="Total citations"
            value={kpis.totalCitations}
            sublabel="References across projects, indicators, explainers"
            icon={Quote}
          />
          <KpiCard
            code="EVD · 03"
            label="Established reliability"
            value={kpis.establishedReliabilityCount}
            sublabel={`${establishedPct}% of evidence is primary law / SCC / treaty text`}
            icon={ShieldCheck}
            tone="sky"
          />
          <KpiCard
            code="EVD · 04"
            label="Projects pending validation"
            value={kpis.projectsPendingValidation}
            sublabel="Have at least one needs_validation claim"
            icon={AlertTriangle}
            tone="amber"
          />
        </div>
      </section>

      <IntelligencePanel
        title="Citation flows — evidence type to project"
        code="EVD · SANKEY"
        subtitle="Width of each ribbon = number of citations from that source type into that project."
      >
        <CitationSankey data={sankey} />
      </IntelligencePanel>

      <IntelligencePanel
        title="Top-cited evidence"
        code="EVD · TOP"
        subtitle="Most-referenced items across projects, indicators, and explainers (top 15)."
      >
        <TopCitedEvidenceChart records={topCited} />
      </IntelligencePanel>

      <IntelligencePanel
        title="Source reliability heatmap"
        code="EVD · HEATMAP"
        subtitle="How the evidence pool breaks down by source type and reliability tier."
      >
        <SourceReliabilityHeatmap
          counts={heatmap.counts}
          reliabilityColumns={heatmap.reliabilityColumns}
          total={heatmap.total}
        />
      </IntelligencePanel>

      <IntelligencePanel
        title="Project watchlist"
        code="EVD · PRJ"
        subtitle={`${projects.length} pilot projects under continuous review across treaty, water, energy, and finance dimensions.`}
      >
        <WatchlistTable projects={projects} />
      </IntelligencePanel>
    </div>
  );
}
