"use client";

import type { EvidenceStrength, SourceType } from "@/lib/content/types";

interface Props {
  /** Pivoted counts: sourceType -> reliability -> count. From evidenceCountsBySourceTypeAndReliability(). */
  counts: Array<{
    sourceType: SourceType;
    reliabilityCounts: Array<{ reliability: EvidenceStrength; count: number }>;
  }>;
  reliabilityColumns: EvidenceStrength[];
  total: number;
}

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

const RELIABILITY_LABEL: Record<EvidenceStrength, string> = {
  weak: "Weak",
  moderate: "Moderate",
  strong: "Strong",
  established: "Established",
};

/**
 * Map a cell count to a CSS background. Uses blue-scale (matches the Python
 * heatmap's "Blues" colormap). Empty cells get a very subtle bg; saturation
 * scales with `count / maxCount`.
 */
function cellStyle(count: number, maxCount: number): React.CSSProperties {
  if (count === 0) {
    return { background: "rgba(120,120,120,0.06)", color: "rgba(120,120,120,0.4)" };
  }
  const ratio = maxCount > 0 ? count / maxCount : 0;
  // Linear interpolation between light blue (#dbeafe) and deep blue (#1e40af)
  // returning rgb so dark/light mode both stay readable.
  const lightR = 219,
    lightG = 234,
    lightB = 254;
  const darkR = 30,
    darkG = 64,
    darkB = 175;
  const r = Math.round(lightR + (darkR - lightR) * ratio);
  const g = Math.round(lightG + (darkG - lightG) * ratio);
  const b = Math.round(lightB + (darkB - lightB) * ratio);
  // Text color: white if the cell is deep, black if pale.
  const fg = ratio > 0.55 ? "#ffffff" : "#0f172a";
  return { background: `rgb(${r}, ${g}, ${b})`, color: fg };
}

export function SourceReliabilityHeatmap({ counts, reliabilityColumns, total }: Props) {
  // Max for color-scale normalization
  let maxCount = 0;
  for (const row of counts) {
    for (const c of row.reliabilityCounts) {
      if (c.count > maxCount) maxCount = c.count;
    }
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="min-w-[520px] w-full border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="text-left text-xs font-mono tracking-wider uppercase text-muted-foreground px-2 py-1.5 w-[220px]">
              Source type
            </th>
            {reliabilityColumns.map((r) => (
              <th
                key={r}
                className="text-center text-xs font-mono tracking-wider uppercase text-muted-foreground px-2 py-1.5"
              >
                {RELIABILITY_LABEL[r]}
              </th>
            ))}
            <th className="text-right text-xs font-mono tracking-wider uppercase text-muted-foreground px-2 py-1.5 w-[60px]">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {counts.map((row) => {
            const rowTotal = row.reliabilityCounts.reduce((acc, c) => acc + c.count, 0);
            return (
              <tr key={row.sourceType}>
                <td className="text-sm text-foreground px-2 py-1.5 font-medium whitespace-nowrap">
                  {SOURCE_TYPE_LABEL[row.sourceType]}
                </td>
                {reliabilityColumns.map((r) => {
                  const cell = row.reliabilityCounts.find((c) => c.reliability === r);
                  const count = cell?.count ?? 0;
                  return (
                    <td
                      key={r}
                      className="text-center text-sm font-mono font-medium tabular-nums rounded-sm transition-colors"
                      style={cellStyle(count, maxCount)}
                      title={`${SOURCE_TYPE_LABEL[row.sourceType]} · ${RELIABILITY_LABEL[r]}: ${count}`}
                    >
                      <div className="px-3 py-2">{count}</div>
                    </td>
                  );
                })}
                <td className="text-right text-sm font-mono text-foreground tabular-nums px-2 py-1.5">
                  {rowTotal}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className="text-xs font-mono tracking-wider uppercase text-muted-foreground px-2 py-1.5">
              Column total
            </td>
            {reliabilityColumns.map((r) => {
              const colTotal = counts.reduce((acc, row) => {
                const cell = row.reliabilityCounts.find((c) => c.reliability === r);
                return acc + (cell?.count ?? 0);
              }, 0);
              return (
                <td
                  key={r}
                  className="text-center text-sm font-mono text-foreground tabular-nums px-2 py-1.5"
                >
                  {colTotal}
                </td>
              );
            })}
            <td className="text-right text-sm font-mono font-semibold text-foreground tabular-nums px-2 py-1.5">
              {total}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
