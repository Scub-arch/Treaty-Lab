import { getEvidence } from "@/lib/content";
import { SourceCard } from "@/components/intel/source-card";

export const metadata = { title: "Evidence Library — Treaty-Lab" };

export default function EvidenceLibraryPage() {
  const items = getEvidence();
  const allTags = Array.from(new Set(items.flatMap((i) => i.tags))).sort();

  return (
    <div className="px-6 py-8 space-y-8 max-w-[1400px] mx-auto">
      <section>
        <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-3">
          EVD · LIBRARY
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
          Evidence Library
        </h1>
        <p className="text-base text-muted-foreground mt-3 max-w-3xl leading-relaxed">
          Public-record sources that ground every claim in this pilot. Each item records what it
          actually supports and its known limitations. Reliability indicates the strength of the
          source itself — not whether you should agree with what it says.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {allTags.map((t) => (
            <span
              key={t}
              className="font-mono text-[10px] text-muted-foreground tracking-wider px-2 py-0.5 border border-border rounded-sm"
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <SourceCard key={item.slug} item={item} />
        ))}
      </section>
    </div>
  );
}
