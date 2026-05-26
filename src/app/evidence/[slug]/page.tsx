import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, ChevronLeft } from "lucide-react";
import { getEvidence, getEvidenceItem } from "@/lib/content";
import { EvidenceStrengthBadge } from "@/components/intel/evidence-strength-badge";

export function generateStaticParams() {
  return getEvidence().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata(props: PageProps<"/evidence/[slug]">) {
  const { slug } = await props.params;
  const e = getEvidenceItem(slug);
  return { title: e ? `${e.title} — Evidence` : "Evidence — Treaty-Lab" };
}

export default async function EvidenceDetail(props: PageProps<"/evidence/[slug]">) {
  const { slug } = await props.params;
  const item = getEvidenceItem(slug);
  if (!item) notFound();

  return (
    <div className="px-6 py-8 space-y-6 max-w-3xl mx-auto">
      <Link
        href="/evidence"
        className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.12em] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="w-3 h-3" />
        BACK TO EVIDENCE
      </Link>

      <header>
        <div className="flex items-center gap-3 flex-wrap mb-2">
          <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
            {item.sourceType.replace(/_/g, " ")}
          </span>
          <EvidenceStrengthBadge strength={item.reliability} />
          {item.publishedAt && (
            <span className="font-mono text-[10px] text-muted-foreground">
              {item.publishedAt}
            </span>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
          {item.title}
        </h1>
        {item.author && (
          <div className="text-sm text-muted-foreground mt-2">{item.author}</div>
        )}
      </header>

      <p className="text-base leading-relaxed">{item.plainSummary}</p>

      <section>
        <div className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground mb-2">
          THIS SOURCE SUPPORTS
        </div>
        <ul className="space-y-2 text-sm leading-relaxed list-disc list-inside marker:text-muted-foreground">
          {item.supports.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </section>

      {item.limitations && item.limitations.length > 0 && (
        <section>
          <div className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground mb-2">
            KNOWN LIMITATIONS
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc list-inside marker:text-muted-foreground/60">
            {item.limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex items-center gap-3 flex-wrap pt-4 border-t border-border">
        <div className="flex flex-wrap gap-1">
          {item.tags.map((t) => (
            <span
              key={t}
              className="font-mono text-[10px] text-muted-foreground tracking-wider px-1.5 py-0.5 border border-border rounded-sm"
            >
              {t}
            </span>
          ))}
        </div>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto font-mono text-[10px] tracking-[0.12em] text-foreground/80 hover:text-foreground inline-flex items-center gap-1"
          >
            VIEW ORIGINAL
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </section>

      {item.citation && (
        <p className="text-xs text-muted-foreground font-mono">{item.citation}</p>
      )}
    </div>
  );
}
