"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import type { SourceType } from "@/lib/content/types";
import type { CitedEvidenceRecord } from "@/lib/content";

interface Props {
  records: CitedEvidenceRecord[];
}

/** Shared Wong / Okabe-Ito palette — kept in sync with per-project-citation-chart.tsx. */
const SOURCE_TYPE_PALETTE: Record<SourceType, string> = {
  government_report: "#0072B2",
  court_decision: "#D55E00",
  legislation: "#CC79A7",
  regulatory_filing: "#56B4E9",
  academic: "#009E73",
  news: "#8C564B",
  corporate_disclosure: "#E69F00",
  treaty_text: "#F0E442",
  ngo_report: "#999999",
  financial_prospectus: "#000000",
};

const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  government_report: "Government report",
  court_decision: "Court decision",
  legislation: "Legislation",
  regulatory_filing: "Regulatory filing",
  academic: "Academic",
  news: "News",
  corporate_disclosure: "Corporate disclosure",
  treaty_text: "Treaty text",
  ngo_report: "NGO report",
  financial_prospectus: "Financial prospectus",
};

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

export function TopCitedEvidenceChart({ records }: Props) {
  // Reverse so that the highest-cited bar sits at the TOP of the chart.
  const data = [...records].reverse().map((r) => ({
    label: truncate(r.title, 70),
    citations: r.citations,
    sourceType: r.sourceType,
    slug: r.slug,
    reliability: r.reliability,
  }));

  // Bars are dynamic-height because labels can be long; allow ~32px per row.
  const height = Math.max(240, data.length * 34);

  // Legend only contains the source types actually present in the top-N.
  const presentTypes: SourceType[] = Array.from(new Set(data.map((d) => d.sourceType as SourceType)));

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 8, right: 56, bottom: 8, left: 8 }}
          barCategoryGap="14%"
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="rgba(120,120,120,0.18)" />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.7 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(120,120,120,0.3)" }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={420}
            tick={{ fontSize: 11, fill: "currentColor", opacity: 0.85 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(120,120,120,0.3)" }}
          />
          <Tooltip
            cursor={{ fill: "rgba(120,120,120,0.08)" }}
            contentStyle={{
              backgroundColor: "rgba(20,20,24,0.96)",
              border: "1px solid rgba(120,120,120,0.4)",
              borderRadius: 8,
              fontSize: 12,
              color: "#fafafa",
              maxWidth: 360,
            }}
            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            formatter={(value, _name, props) => {
              const p = props.payload as { sourceType: SourceType; reliability: string; slug: string };
              const stLabel = SOURCE_TYPE_LABEL[p.sourceType] ?? p.sourceType;
              return [
                `${value} citation site${value === 1 ? "" : "s"} · ${stLabel} · ${p.reliability}`,
                p.slug,
              ];
            }}
          />
          <Bar dataKey="citations" isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.slug} fill={SOURCE_TYPE_PALETTE[d.sourceType as SourceType] ?? "#aaaaaa"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Compact legend keyed by source types present in this top-N */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 px-2 text-[11px] text-muted-foreground">
        {presentTypes.map((st) => (
          <span key={st} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: SOURCE_TYPE_PALETTE[st] }}
            />
            {SOURCE_TYPE_LABEL[st]}
          </span>
        ))}
      </div>
    </div>
  );
}
