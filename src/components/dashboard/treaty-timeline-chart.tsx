"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TreatyTimelinePoint } from "@/lib/dashboard-data";

interface Props {
  data: TreatyTimelinePoint[];
}

export function TreatyTimelineChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
        No timeline data
      </div>
    );
  }
  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="signedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#56B4E9" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#56B4E9" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="ratifiedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#009E73" stopOpacity={0.45} />
              <stop offset="100%" stopColor="#009E73" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}
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
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--muted-foreground)",
            }}
            formatter={(v, name) => [
              v as number,
              name === "signed" ? "Treaties opened" : "Signatures ratified",
            ]}
          />
          <Area
            type="monotone"
            dataKey="signed"
            stroke="#56B4E9"
            fill="url(#signedFill)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="ratified"
            stroke="#009E73"
            fill="url(#ratifiedFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
