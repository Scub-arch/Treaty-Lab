"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import type { SeveritySlice } from "@/lib/dashboard-data";
import type { Severity } from "@/lib/content/types";

const SEVERITY_ORDER: Severity[] = ["low", "moderate", "elevated", "high", "critical"];
const SEVERITY_COLOR: Record<Severity, string> = {
  low: "#10b981",
  moderate: "#0ea5e9",
  elevated: "#f59e0b",
  high: "#fb923c",
  critical: "#ef4444",
};
const SEVERITY_LABEL: Record<Severity, string> = {
  low: "Low",
  moderate: "Moderate",
  elevated: "Elevated",
  high: "High",
  critical: "Critical",
};

interface Props {
  data: SeveritySlice[];
}

export function SeverityBar({ data }: Props) {
  const fullData = SEVERITY_ORDER.map((severity) => ({
    severity,
    label: SEVERITY_LABEL[severity],
    count: data.find((d) => d.severity === severity)?.count ?? 0,
  }));
  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={fullData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            width={28}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", fillOpacity: 0.4 }}
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 12,
            }}
            formatter={(v) => [v as number, "Indicators"]}
          />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {fullData.map((d) => (
              <Cell key={d.severity} fill={SEVERITY_COLOR[d.severity]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
