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

/**
 * AESO large-load (data-centre) interconnection queue growth over 2025.
 *
 * All three data points are cited public AESO disclosures (March 2025 Update,
 * June 2025 Phase I deck, December 2025 Annual Report).
 */
const QUEUE_TIMELINE = [
  { period: "Mar 2025", queueMW: 11834, projects: 22 },
  { period: "Jun 2025", queueMW: 16229, projects: 29 },
  { period: "YE 2025", queueMW: 20000, projects: null },
];

/** Alberta winter peak demand for reference (12,785 MW, 2025 record). */
const REFERENCE_PEAK_MW = 12785;
/** Phase I interim cap actually allocated (1,200 MW). */
const PHASE_I_CAP_MW = 1200;

export function LoadGrowthTrend() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <div className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
          AESO Large-Load Queue · 2025
        </div>
        <div className="font-mono text-[10px] text-muted-foreground tabular-nums">
          MW
        </div>
      </div>
      <div className="flex items-baseline gap-3">
        <div className="font-mono text-2xl font-semibold tabular-nums text-foreground">
          20,000+
        </div>
        <div className="font-mono text-[10px] tracking-[0.12em] text-orange-400">
          ↗ +69% Mar → YE
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
        Year-end 2025 queue is ≈1.9× Alberta&apos;s avg demand (~10,500 MW) and
        ≈17× the 1,200 MW Phase I cap actually cleared.
      </p>

      <div className="h-[180px] w-full mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={QUEUE_TIMELINE}
            margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
          >
            <defs>
              <linearGradient id="fill-queue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="currentColor"
              strokeOpacity={0.08}
            />
            <XAxis
              dataKey="period"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "currentColor",
                opacity: 0.6,
                fontSize: 10,
                fontFamily: "var(--font-mono)",
              }}
            />
            <YAxis
              hide
              domain={[0, 22000]}
            />
            <Tooltip
              cursor={{ stroke: "currentColor", strokeOpacity: 0.2 }}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                fontSize: 11,
                fontFamily: "var(--font-mono)",
              }}
              labelStyle={{ color: "var(--foreground)" }}
              formatter={(value, name) => {
                if (typeof value === "number" && name === "queueMW") {
                  return [`${value.toLocaleString()} MW`, "Queued load"];
                }
                return [String(value ?? ""), String(name ?? "")];
              }}
            />
            <Area
              type="monotone"
              dataKey="queueMW"
              stroke="var(--brand)"
              strokeWidth={1.75}
              fill="url(#fill-queue)"
              activeDot={{ r: 3.5, fill: "var(--brand)" }}
              dot={{ r: 2.5, fill: "var(--brand)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 pt-2 border-t border-border/60 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] font-mono">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground">AB winter peak (2025)</span>
          <span className="tabular-nums text-foreground/85">
            {REFERENCE_PEAK_MW.toLocaleString()}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground">Phase I cap cleared</span>
          <span className="tabular-nums text-foreground/85">
            {PHASE_I_CAP_MW.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
