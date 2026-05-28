import { ScrollText, Signature as SignatureIcon, ShieldCheck, Users } from "lucide-react";
import { IntelligencePanel } from "@/components/intel/intelligence-panel";
import { KpiCard } from "./kpi-card";
import { TreatiesTable } from "./treaties-table";
import { TreatyTimelineChart } from "./treaty-timeline-chart";
import { TreatyPartyDonut } from "./treaty-party-donut";
import { TreatyTopicBar } from "./treaty-topic-bar";
import type { TreatiesTabData, TreatyDetail } from "@/lib/dashboard-data";

interface Props {
  data: TreatiesTabData;
  detailsById: Record<string, TreatyDetail>;
}

export function TreatiesTab({ data, detailsById }: Props) {
  const { kpis, rows, timeline, partyTypes, topicDistribution } = data;
  const inForcePct = kpis.totalTreaties
    ? Math.round((kpis.treatiesInForce / kpis.totalTreaties) * 100)
    : 0;
  return (
    <div className="space-y-6">
      {/* KPI row */}
      <section>
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mb-3">
          TRT · OVERVIEW
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            code="TRT · 01"
            label="Treaties tracked"
            value={kpis.totalTreaties}
            sublabel="Numbered + multilateral records"
            icon={ScrollText}
          />
          <KpiCard
            code="TRT · 02"
            label="Total signatures"
            value={kpis.totalSignatures}
            sublabel="Party x treaty join rows"
            icon={SignatureIcon}
          />
          <KpiCard
            code="TRT · 03"
            label="In force"
            value={kpis.treatiesInForce}
            sublabel={`${inForcePct}% of catalog has an entered-into-force date`}
            icon={ShieldCheck}
            tone="emerald"
          />
          <KpiCard
            code="TRT · 04"
            label="Unique parties"
            value={kpis.uniqueParties}
            sublabel="Countries + organizations represented"
            icon={Users}
          />
        </div>
      </section>

      {/* Charts row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <IntelligencePanel
          title="Treaty activity over time"
          code="TRT · TIMELINE"
          subtitle="Years a treaty opened (signed) vs years signatures were ratified."
        >
          <TreatyTimelineChart data={timeline} />
        </IntelligencePanel>
        <IntelligencePanel
          title="Party composition"
          code="TRT · PARTIES"
          subtitle="Mix of country signatories vs intergovernmental organizations."
        >
          <TreatyPartyDonut data={partyTypes} />
        </IntelligencePanel>
      </section>

      {/* Topics */}
      <IntelligencePanel
        title="Topic distribution"
        code="TRT · TOPICS"
        subtitle="How many treaties touch each topic. Hover for exact counts."
      >
        <TreatyTopicBar data={topicDistribution} />
      </IntelligencePanel>

      {/* Primary table with side panel */}
      <IntelligencePanel
        title="Treaty catalog"
        code="TRT · CATALOG"
        subtitle="Click a row to investigate signatures, ratifications, and topics."
      >
        <TreatiesTable rows={rows} detailsById={detailsById} />
      </IntelligencePanel>
    </div>
  );
}
