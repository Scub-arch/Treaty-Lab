"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { EvidenceItem, SourceType, EvidenceStrength } from "@/lib/content/types";
import { SourceCard } from "@/components/intel/source-card";

/**
 * UI-004 — client-side search + facet filtering for the Evidence Library list.
 * Operates entirely on the server-provided `items`; no network, no DB. Facets
 * (source type, reliability, tag) and a free-text query all AND together;
 * within a facet, selections OR together.
 */

const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  court_decision: "Court decision",
  legislation: "Legislation",
  treaty_text: "Treaty text",
  regulatory_filing: "Regulatory filing",
  government_report: "Govt report",
  academic: "Academic",
  news: "News",
  ngo_report: "NGO report",
  corporate_disclosure: "Corporate disclosure",
  financial_prospectus: "Financial prospectus",
};

const SOURCE_TYPE_ORDER: SourceType[] = [
  "court_decision",
  "legislation",
  "treaty_text",
  "regulatory_filing",
  "government_report",
  "academic",
  "news",
  "ngo_report",
  "corporate_disclosure",
  "financial_prospectus",
];

const RELIABILITY_ORDER: EvidenceStrength[] = ["established", "strong", "moderate", "weak"];
const RELIABILITY_LABEL: Record<EvidenceStrength, string> = {
  established: "Established",
  strong: "Strong",
  moderate: "Moderate",
  weak: "Weak",
};

function chip(active: boolean): string {
  return `rounded-md border px-2.5 py-1 text-xs transition-colors ${
    active
      ? "border-foreground bg-foreground text-background"
      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
  }`;
}

function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function EvidenceBrowser({ items }: { items: EvidenceItem[] }) {
  const [query, setQuery] = useState("");
  const [types, setTypes] = useState<Set<SourceType>>(new Set());
  const [reliabilities, setReliabilities] = useState<Set<EvidenceStrength>>(new Set());
  const [tags, setTags] = useState<Set<string>>(new Set());

  const presentTypes = useMemo(
    () => SOURCE_TYPE_ORDER.filter((t) => items.some((i) => i.sourceType === t)),
    [items],
  );
  const presentReliabilities = useMemo(
    () => RELIABILITY_ORDER.filter((r) => items.some((i) => i.reliability === r)),
    [items],
  );
  const allTags = useMemo(
    () => Array.from(new Set(items.flatMap((i) => i.tags))).sort(),
    [items],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (types.size && !types.has(i.sourceType)) return false;
      if (reliabilities.size && !reliabilities.has(i.reliability)) return false;
      if (tags.size && !i.tags.some((t) => tags.has(t))) return false;
      if (q) {
        const hay = [i.title, i.plainSummary, i.author ?? "", ...i.supports, ...i.tags]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, query, types, reliabilities, tags]);

  const anyActive =
    query.trim() !== "" || types.size > 0 || reliabilities.size > 0 || tags.size > 0;

  function clearAll() {
    setQuery("");
    setTypes(new Set());
    setReliabilities(new Set());
    setTags(new Set());
  }

  return (
    <div className="space-y-5">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search title, summary, author, tags…"
        aria-label="Search evidence"
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="space-y-3">
        <FacetRow label="Type">
          {presentTypes.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={types.has(t)}
              onClick={() => setTypes((prev) => toggleSet(prev, t))}
              className={chip(types.has(t))}
            >
              {SOURCE_TYPE_LABEL[t]}
            </button>
          ))}
        </FacetRow>

        <FacetRow label="Reliability">
          {presentReliabilities.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={reliabilities.has(r)}
              onClick={() => setReliabilities((prev) => toggleSet(prev, r))}
              className={chip(reliabilities.has(r))}
            >
              {RELIABILITY_LABEL[r]}
            </button>
          ))}
        </FacetRow>

        <FacetRow label="Tags">
          {allTags.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tags.has(t)}
              onClick={() => setTags((prev) => toggleSet(prev, t))}
              className={chip(tags.has(t))}
            >
              {t}
            </button>
          ))}
        </FacetRow>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
          SHOWING {filtered.length} OF {items.length}
        </div>
        {anyActive && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <SourceCard key={item.slug} item={item} />
          ))}
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No evidence matches these filters.
        </p>
      )}
    </div>
  );
}

function FacetRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground w-16 shrink-0">
        {label.toUpperCase()}
      </span>
      {children}
    </div>
  );
}
