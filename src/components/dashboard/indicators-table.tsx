import Link from "next/link";
import { cn } from "@/lib/utils";
import type { IndicatorRow } from "@/lib/dashboard-data";
import { SeverityBadge, TrendIndicator } from "@/components/intel/indicator-badge";
import type { Trend } from "@/lib/content/types";

interface Props {
  rows: IndicatorRow[];
}

export function IndicatorsTable({ rows }: Props) {
  return (
    <div className="overflow-x-auto border border-border rounded-md bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr className="border-b border-border text-left">
            <Th>Indicator</Th>
            <Th>Domain</Th>
            <Th align="right">Value</Th>
            <Th>Severity</Th>
            <Th>Trend</Th>
            <Th align="right">Updated</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.slug}
              className={cn(
                "border-b border-border/40 hover:bg-muted/30 transition-colors",
                i === rows.length - 1 && "border-b-0",
              )}
            >
              <td className="px-3 py-3">
                <Link
                  href={`/${r.domain}#${r.slug}`}
                  className="font-medium text-foreground hover:underline underline-offset-2"
                >
                  {r.name}
                </Link>
                <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug max-w-md">
                  {r.summary}
                </div>
              </td>
              <td className="px-3 py-3">
                <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                  {r.domainLabel}
                </span>
              </td>
              <td className="px-3 py-3 text-right font-mono text-sm tabular-nums">
                {r.value}
              </td>
              <td className="px-3 py-3">
                <SeverityBadge severity={r.severity} />
              </td>
              <td className="px-3 py-3">
                <TrendIndicator trend={r.trend as Trend} />
              </td>
              <td className="px-3 py-3 text-right font-mono text-[11px] text-muted-foreground tabular-nums">
                {r.updatedAt.slice(0, 10)}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-xs text-muted-foreground">
                No indicators in scope.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={cn(
        "font-mono text-[10px] tracking-[0.12em] text-muted-foreground font-medium px-3 py-2.5",
        align === "right" && "text-right",
      )}
    >
      {children}
    </th>
  );
}
