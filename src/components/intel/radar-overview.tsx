"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

export interface DomainComposite {
  /** Domain key (treaty, water, energy, finance, governance) */
  domain: string;
  /** Display label (e.g. "Treaty") */
  label: string;
  /** Aggregated severity score: 0=low, 5=critical */
  severityScore: number;
  /** How many indicators contribute to this score */
  indicatorCount: number;
}

interface Props {
  composites: DomainComposite[];
  /** Optional override for the maximum score on the axis (default 5) */
  maxScore?: number;
}

/** Cross-domain composite severity radar — Command Center centerpiece. */
export function RadarOverview({ composites, maxScore = 5 }: Props) {
  const chartConfig: ChartConfig = {
    severity: {
      label: "Composite severity",
      color: "var(--brand)",
    },
  };

  const data = composites.map((c) => ({
    domain: c.label,
    severity: c.severityScore,
    indicatorCount: c.indicatorCount,
  }));

  return (
    <div className="mx-auto w-full max-w-[460px] h-[340px]">
      <ChartContainer config={chartConfig} className="!aspect-auto h-full w-full">
        <RadarChart data={data} outerRadius="78%">
          <PolarGrid stroke="currentColor" strokeOpacity={0.15} radialLines={false} />
          <PolarAngleAxis
            dataKey="domain"
            tick={{
              fill: "currentColor",
              opacity: 0.7,
              fontSize: 11,
              letterSpacing: "0.05em",
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, maxScore]}
            tick={false}
            axisLine={false}
          />
          <Radar
            dataKey="severity"
            stroke="var(--color-severity)"
            fill="var(--color-severity)"
            fillOpacity={0.25}
            strokeWidth={1.5}
            dot={{
              r: 3,
              fill: "var(--color-severity)",
              stroke: "var(--color-severity)",
            }}
          />
        </RadarChart>
      </ChartContainer>
    </div>
  );
}
