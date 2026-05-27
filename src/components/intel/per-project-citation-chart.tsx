"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer } from "recharts";
import type { SourceType } from "@/lib/content/types";

export interface CitationChartRow {
  project: string;
  total: number;
  government_report?: number;
  court_decision?: number;
  legislation?: number;
  regulatory_filing?: number;
  academic?: number;
  news?: number;
  corporate_disclosure?: number;
  treaty_text?: number;
  ngo_report?: number;
  financial_prospectus?: number;
  /** Index signature so server-side code can write known source-type keys generically. */
  [k: string]: number | string | undefined;
}

interface Props {
  rows: CitationChartRow[];
  /** Source-type stacks to render — only ones with non-zero data in `rows`. */
  presentTypes: SourceType[];
}

/** Colorblind-friendly Wong / Okabe-Ito palette, extended for the 10 SourceType values. */
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

export function PerProjectCitationChart({ rows, presentTypes }: Props) {
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 56)}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 8, right: 64, bottom: 8, left: 8 }}
          barCategoryGap="20%"
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
            dataKey="project"
            width={170}
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
            }}
            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            formatter={(value, name) => {
              const label = SOURCE_TYPE_LABEL[name as SourceType] ?? String(name);
              return [String(value), label];
            }}
          />
          <Legend
            verticalAlign="bottom"
            iconSize={10}
            wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
            formatter={(value) => SOURCE_TYPE_LABEL[value as SourceType] ?? value}
          />
          {presentTypes.map((st) => (
            <Bar
              key={st}
              dataKey={st}
              stackId="cite"
              fill={SOURCE_TYPE_PALETTE[st]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
