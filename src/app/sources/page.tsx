import Link from "next/link";
import { ChevronRight, ExternalLink } from "lucide-react";
import { getEvidence } from "@/lib/content";
import type { EvidenceItem } from "@/lib/content/types";
import { Separator } from "@/components/ui/separator";
import { EvidenceStrengthBadge } from "@/components/intel/evidence-strength-badge";

export const metadata = { title: "Cited Sources Index — Treaty-Lab" };

const SOURCE_TYPE_LABEL: Record<EvidenceItem["sourceType"], string> = {
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

const TAG_GROUPS: { tag: string; label: string; description: string }[] = [
  { tag: "law", label: "Law", description: "Constitution, treaties, statutes, court decisions, regulatory directives." },
  { tag: "finance", label: "Finance", description: "Loan-guarantee program docs, FNFA filings, CER market snapshots, corporate financing disclosures." },
  { tag: "water", label: "Water", description: "Allocation directives, drought response, watershed studies, oil-sands monitoring." },
  { tag: "power", label: "Power", description: "AESO filings, NERC, AB AI strategy, proponent disclosures." },
  { tag: "government", label: "Government", description: "Federal Action Plans, provincial business plans, ministerial guidance." },
  { tag: "community", label: "Community", description: "OCAP principles, First Nations data sovereignty, project assessments." },
  { tag: "market", label: "Market", description: "Capital-markets disclosures, credit-rating reports, sector reviews." },
  { tag: "company", label: "Company", description: "Proponent fact sheets, investor releases, corporate policy documents." },
];

export default function SourcesIndexPage() {
  const evidence = getEvidence();

  // Each evidence item appears once, in its FIRST listed tag's group.
  const grouped = new Map<string, EvidenceItem[]>();
  for (const tag of TAG_GROUPS.map((g) => g.tag)) grouped.set(tag, []);
  for (const item of evidence) {
    const primaryTag = item.tags.find((t) => grouped.has(t));
    if (primaryTag) grouped.get(primaryTag)!.push(item);
  }

  // Sort each group by publishedAt descending where present
  for (const [, items] of grouped) {
    items.sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  }

  const totalItems = evidence.length;

  return (
    <div className="px-6 py-8 space-y-8 max-w-[1400px] mx-auto">
      <section>
        <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-3">
          SRC · INDEX
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
          Cited Sources
        </h1>
        <p className="text-base text-muted-foreground mt-3 max-w-3xl leading-relaxed">
          A dense index of every public-record source cited in this pilot ({totalItems} total),
          grouped by primary domain. For the full annotated view of each source (what it supports,
          known limitations, plain-language summary), open the{" "}
          <Link href="/evidence" className="underline underline-offset-2 hover:text-foreground">
            Evidence Library
          </Link>
          .
        </p>
      </section>

      {TAG_GROUPS.map((group) => {
        const items = grouped.get(group.tag) ?? [];
        if (items.length === 0) return null;
        return (
          <section key={group.tag}>
            <div className="flex items-baseline justify-between gap-4 mb-3">
              <div>
                <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
                  SRC · {group.label.toUpperCase()} · {String(items.length).padStart(2, "0")}
                </div>
                <h2 className="text-lg font-semibold tracking-tight mt-1">{group.label}</h2>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
                  {group.description}
                </p>
              </div>
            </div>
            <div className="border border-border rounded-md bg-card overflow-hidden">
              <Separator />
              {items.map((item, i) => (
                <div key={item.slug}>
                  <Link
                    href={`/evidence/${item.slug}`}
                    className="grid grid-cols-[110px_1fr_120px_110px_24px] items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase truncate">
                      {SOURCE_TYPE_LABEL[item.sourceType]}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium text-sm leading-tight truncate text-foreground">
                        {item.title}
                      </div>
                      {item.author && (
                        <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {item.author}
                        </div>
                      )}
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums text-right">
                      {item.publishedAt ?? "—"}
                    </span>
                    <EvidenceStrengthBadge strength={item.reliability} withIcon={false} />
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                  </Link>
                  {i < items.length - 1 && <Separator className="bg-border/40" />}
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <section className="pt-6 border-t border-border">
        <div className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
          Each row links to the full evidence detail. Direct links to original source documents
          (where the canonical URL is in the source itself) are available there — marked with an{" "}
          <ExternalLink className="inline w-3 h-3 mb-0.5" /> icon.
        </div>
      </section>
    </div>
  );
}
