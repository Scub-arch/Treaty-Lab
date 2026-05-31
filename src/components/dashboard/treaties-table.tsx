"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { X, ExternalLink, Filter, ChevronUp, ChevronDown } from "lucide-react";
import type { TreatyDetail, TreatyRow } from "@/lib/dashboard-data";

interface Props {
  rows: TreatyRow[];
  detailsById: Record<string, TreatyDetail>;
}

type SortKey = "name" | "openedAt" | "enteredIntoForceAt" | "partyCount" | "ratifiedCount";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | "in_force" | "opened_only";

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: "All treaties",
  in_force: "In force",
  opened_only: "Opened only",
};

export function TreatiesTable({ rows, detailsById }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("openedAt");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const visibleRows = useMemo(() => {
    let r = rows.slice();
    if (statusFilter === "in_force") r = r.filter((row) => row.enteredIntoForceAt != null);
    else if (statusFilter === "opened_only") r = r.filter((row) => row.enteredIntoForceAt == null);
    r.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number")
        return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return r;
  }, [rows, sortKey, sortDir, statusFilter]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir(k === "name" ? "asc" : "desc");
    }
  }

  const detail = selectedId ? detailsById[selectedId] : null;
  const panelOpen = detail != null;

  return (
    <div className="flex gap-4 transition-all duration-300">
      {/* Table column */}
      <div className={cn("transition-all duration-300", panelOpen ? "w-2/3" : "w-full")}>
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-card text-xs hover:bg-muted/40 transition-colors"
            >
              <Filter className="w-3 h-3 text-muted-foreground" />
              <span className="text-foreground/90">{STATUS_LABELS[statusFilter]}</span>
            </button>
            {filterOpen && (
              <div className="absolute top-full left-0 mt-1 z-30 min-w-[160px] bg-card border border-border rounded-md shadow-lg overflow-hidden">
                {(Object.keys(STATUS_LABELS) as StatusFilter[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setStatusFilter(k);
                      setFilterOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-1.5 text-xs hover:bg-muted/60 transition-colors",
                      statusFilter === k && "bg-muted/40 text-foreground",
                    )}
                  >
                    {STATUS_LABELS[k]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono ml-2">
            {visibleRows.length} / {rows.length} treaties
          </div>
        </div>

        <div className="overflow-x-auto border border-border rounded-md bg-card">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm">
              <tr className="border-b border-border text-left">
                <SortHeader
                  k="name"
                  label="Treaty"
                  current={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                />
                <SortHeader
                  k="openedAt"
                  label="Opened"
                  current={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
                <SortHeader
                  k="enteredIntoForceAt"
                  label="In force"
                  current={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
                <SortHeader
                  k="partyCount"
                  label="Parties"
                  current={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
                <SortHeader
                  k="ratifiedCount"
                  label="Ratifications"
                  current={sortKey}
                  dir={sortDir}
                  onClick={toggleSort}
                  align="right"
                />
                <th className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground font-medium px-3 py-2.5">
                  TOPICS
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((t, i) => {
                const active = t.id === selectedId;
                return (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedId(active ? null : t.id)}
                    className={cn(
                      "border-b border-border/40 cursor-pointer transition-colors",
                      active ? "bg-sky-500/10 hover:bg-sky-500/15" : "hover:bg-muted/30",
                      i === visibleRows.length - 1 && "border-b-0",
                    )}
                  >
                    <td className="px-3 py-3">
                      <div className="font-medium text-foreground leading-tight">{t.name}</div>
                      {t.shortName && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {t.shortName}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs text-muted-foreground tabular-nums">
                      {formatDate(t.openedAt)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs tabular-nums">
                      {t.enteredIntoForceAt ? (
                        <span className="text-emerald-400">{formatDate(t.enteredIntoForceAt)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm font-medium tabular-nums">
                      {t.partyCount}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm tabular-nums">
                      <span
                        className={cn(
                          t.ratifiedCount === 0 && "text-muted-foreground",
                          t.ratifiedCount > 0 && t.ratifiedCount < t.partyCount && "text-amber-400",
                          t.ratifiedCount > 0 &&
                            t.ratifiedCount === t.partyCount &&
                            "text-emerald-400",
                        )}
                      >
                        {t.ratifiedCount}
                      </span>
                      <span className="text-muted-foreground"> / {t.partyCount}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {t.topics.slice(0, 3).map((tp) => (
                          <span
                            key={tp.slug}
                            className="font-mono text-[10px] tracking-[0.05em] px-1.5 py-0.5 rounded-sm bg-muted/50 text-muted-foreground"
                          >
                            {tp.name}
                          </span>
                        ))}
                        {t.topics.length > 3 && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            +{t.topics.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-xs text-muted-foreground">
                    No treaties match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Investigation side panel */}
      {detail && (
        <aside className="w-1/3 border border-border rounded-md bg-card flex flex-col overflow-hidden transition-all duration-300">
          <header className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border bg-muted/30">
            <div className="min-w-0">
              <div className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground mb-1">
                TREATY DETAIL · {detail.slug.toUpperCase()}
              </div>
              <h3 className="font-semibold text-sm text-foreground leading-tight">{detail.name}</h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Close treaty detail"
              className="shrink-0 p-1 rounded-sm hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
            <DetailBlock label="Opened">{formatDate(detail.openedAt)}</DetailBlock>
            <DetailBlock label="Entered into force">
              {detail.enteredIntoForceAt ? formatDate(detail.enteredIntoForceAt) : "Not in force"}
            </DetailBlock>
            {detail.depository && <DetailBlock label="Depository">{detail.depository}</DetailBlock>}
            {detail.summary && (
              <DetailBlock label="Summary">
                <p className="text-xs leading-relaxed text-foreground/90">{detail.summary}</p>
              </DetailBlock>
            )}
            {detail.topics.length > 0 && (
              <DetailBlock label="Topics">
                <div className="flex flex-wrap gap-1.5">
                  {detail.topics.map((t) => (
                    <span
                      key={t.slug}
                      className="font-mono text-[10px] tracking-[0.05em] px-1.5 py-0.5 rounded-sm bg-muted/60 text-foreground/90"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              </DetailBlock>
            )}
            <DetailBlock label={`Signatures (${detail.signatures.length})`}>
              <ul className="space-y-1.5 mt-1">
                {detail.signatures.map((s) => (
                  <li
                    key={s.id}
                    className="border border-border/60 rounded-md px-2.5 py-1.5 bg-background/40"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-medium text-xs text-foreground">{s.party.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.08em]">
                        {s.party.type}
                      </div>
                    </div>
                    <div className="flex items-baseline gap-3 mt-1 font-mono text-[10px] text-muted-foreground tabular-nums">
                      <span>signed: {s.signedAt ? formatDate(s.signedAt) : "—"}</span>
                      <span
                        className={cn(
                          s.ratifiedAt ? "text-emerald-400" : "text-muted-foreground",
                        )}
                      >
                        ratified: {s.ratifiedAt ? formatDate(s.ratifiedAt) : "—"}
                      </span>
                    </div>
                    {s.reservation && (
                      <div className="text-[11px] text-muted-foreground mt-1 italic">
                        Reservation: {s.reservation}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </DetailBlock>
            {detail.sourceUrl && (
              <a
                href={detail.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 hover:underline underline-offset-2"
              >
                <ExternalLink className="w-3 h-3" />
                Source text
              </a>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}

function SortHeader({
  k,
  label,
  current,
  dir,
  onClick,
  align = "left",
}: {
  k: SortKey;
  label: string;
  current: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = current === k;
  return (
    <th
      className={cn(
        "font-mono text-[10px] tracking-[0.12em] text-muted-foreground font-medium px-3 py-2.5",
        align === "right" && "text-right",
      )}
    >
      <button
        type="button"
        onClick={() => onClick(k)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground transition-colors",
          active && "text-foreground",
          align === "right" && "flex-row-reverse",
        )}
      >
        {label.toUpperCase()}
        {active &&
          (dir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
      </button>
    </th>
  );
}

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground mb-1">
        {label.toUpperCase()}
      </div>
      <div className="text-foreground/90">{children}</div>
    </div>
  );
}

function formatDate(iso: string): string {
  // Treat ISO date as UTC to avoid local-tz drift on historical dates
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
