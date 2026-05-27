import { Gauge, Activity, ArrowDownRight, Layers } from "lucide-react";
import { IntelligencePanel } from "@/components/intel/intelligence-panel";
import { RadarOverview } from "@/components/intel/radar-overview";
import { KpiCard } from "./kpi-card";
import { SeverityBar } from "./severity-bar";
import { IndicatorsTable } from "./indicators-table";
import type { ResourcesTabData } from "@/lib/dashboard-data";

interface Props {
  data: ResourcesTabData;
}

export function ResourcesTab({ data }: Props) {
  const { kpis, composites, rows, severityBreakdown } = data;
  const highRiskPct = kpis.indicatorCount
    ? Math.round((kpis.criticalOrHigh / kpis.indicatorCount) * 100)
    : 0;
  return (
    <div className="space-y-6">
      <section>
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mb-3">
          RES · OVERVIEW
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            code="RES · 01"
            label="Indicators in scope"
            value={kpis.indicatorCount}
            sublabel="Energy + water + finance combined"
            icon={Gauge}
          />
          <KpiCard
            code="RES · 02"
            label="High or critical"
            value={kpis.criticalOrHigh}
            sublabel={`${highRiskPct}% of scope flagged elevated risk`}
            icon={Activity}
            tone="rose"
          />
          <KpiCard
            code="RES · 03"
            label="Deteriorating trend"
            value={kpis.deterioratingCount}
            sublabel="Indicators with trend = deteriorating"
            icon={ArrowDownRight}
            tone="amber"
          />
          <KpiCard
            code="RES · 04"
            label="Cross-domain projects"
            value={kpis.crossDomainProjects}
            sublabel="Projects spanning energy + water + finance"
            icon={Layers}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <IntelligencePanel
          title="Composite severity"
          code="RES · COMPOSITE"
          subtitle="Average indicator severity per resource domain."
        >
          <RadarOverview composites={composites} />
          <div className="mt-4 pt-4 border-t border-border/60">
            <ul className="space-y-1.5 text-sm">
              {composites.map((c) => (
                <li key={c.domain} className="flex items-baseline justify-between gap-3">
                  <span className="text-foreground/90">{c.label}</span>
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono tabular-nums font-medium">{c.severityScore.toFixed(2)}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">/ 5.00</span>
                    <span className="font-mono text-[10px] text-muted-foreground">({c.indicatorCount} ind.)</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </IntelligencePanel>
        <IntelligencePanel
          title="Severity distribution"
          code="RES · DIST"
          subtitle="How resource indicators are bucketed across the severity scale."
        >
          <SeverityBar data={severityBreakdown} />
        </IntelligencePanel>
      </section>

      <IntelligencePanel
        title="Indicator readout"
        code="RES · INDICATORS"
        subtitle="Sorted by severity. Click an indicator name to jump to its module page."
      >
        <IndicatorsTable rows={rows} />
      </IntelligencePanel>
    </div>
  );
}
