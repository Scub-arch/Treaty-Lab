"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { PartyTypeSlice } from "@/lib/dashboard-data";
import { withChartErrorBoundary } from "@/components/ui/chart-error-boundary";

interface Props {
  data: PartyTypeSlice[];
}

const COLORS = ["#0072B2", "#E69F00", "#009E73", "#CC79A7", "#56B4E9"];

const TYPE_LABEL: Record<string, string> = {
  country: "Countries",
  organization: "Organizations",
};

function TreatyPartyDonutInner({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
        No party data
      </div>
    );
  }
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="w-full h-56 flex items-center gap-4">
      <div className="flex-1 h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="type"
              innerRadius="55%"
              outerRadius="85%"
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {data.map((d, i) => (
                <Cell key={d.type} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 12,
              }}
              formatter={(v, name) => [v as number, TYPE_LABEL[name as string] ?? (name as string)]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="text-xs space-y-2 shrink-0 pr-2">
        {data.map((d, i) => (
          <li key={d.type} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-foreground/90 capitalize">{TYPE_LABEL[d.type] ?? d.type}</span>
            <span className="font-mono tabular-nums text-muted-foreground ml-auto">{d.count}</span>
            <span className="font-mono text-[10px] text-muted-foreground/70">
              {((d.count / total) * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const TreatyPartyDonut = withChartErrorBoundary(TreatyPartyDonutInner, "DSH · PARTIES");
