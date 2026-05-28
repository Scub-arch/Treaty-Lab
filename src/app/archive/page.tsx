import Link from "next/link";
import { prisma } from "@/lib/db";
import { Archive as ArchiveIcon } from "lucide-react";

export const metadata = { title: "Treaty Archive — Treaty-Lab" };

export default async function ArchivePage(props: PageProps<"/archive">) {
  const search = await props.searchParams;
  const topicFilter = typeof search.topic === "string" ? search.topic : undefined;

  const treaties = await prisma.treaty.findMany({
    where: topicFilter ? { topics: { some: { slug: topicFilter } } } : undefined,
    include: {
      topics: true,
      signatures: { include: { party: true } },
    },
    orderBy: { openedAt: "asc" },
  });

  const allTopics = await prisma.topic.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { treaties: true } } },
  });

  return (
    <div className="px-6 py-8 space-y-8 max-w-[1400px] mx-auto">
      <section>
        <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-3">
          ARC · INDEX
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
          Treaty Archive
        </h1>
        <p className="text-base text-muted-foreground mt-3 max-w-3xl leading-relaxed">
          The historical and international treaty texts that ground the modern Indigenous-rights
          arguments tracked elsewhere in this terminal. The Canadian Numbered Treaties (Treaty 1
          through Treaty 11) are included with both the Crown's written text and a note on the
          divergence from oral histories of the signatories. International instruments include
          UNDRIP, ILO 169, the UN Charter, the Vienna Convention on the Law of Treaties, the Paris
          Agreement, and Geneva Convention IV.
        </p>
      </section>

      <section>
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mb-2">
          ARC · 01 — FILTER BY TOPIC
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FilterChip href="/archive" active={!topicFilter}>
            All ({treaties.length})
          </FilterChip>
          {allTopics.map((t) => (
            <FilterChip
              key={t.slug}
              href={`/archive?topic=${t.slug}`}
              active={topicFilter === t.slug}
            >
              {t.name} ({t._count.treaties})
            </FilterChip>
          ))}
        </div>
      </section>

      <section>
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground mb-3">
          ARC · 02 — TREATIES ({treaties.length})
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {treaties.map((t) => (
            <article
              key={t.id}
              className="border border-border rounded-md bg-card p-5 hover:border-foreground/20 transition-colors"
            >
              <div className="flex items-start gap-3 mb-2">
                <ArchiveIcon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground">
                    {t.openedAt.getFullYear()}
                    {t.shortName ? ` · ${t.shortName.toUpperCase()}` : ""}
                  </div>
                  <h2 className="font-semibold text-base leading-tight mt-1">
                    <Link
                      href={`/archive/${t.slug}`}
                      className="hover:underline underline-offset-2"
                    >
                      {t.name}
                    </Link>
                  </h2>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">{t.summary}</p>
              <footer className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex flex-wrap gap-1">
                  {t.topics.map((topic) => (
                    <span
                      key={topic.id}
                      className="font-mono text-[10px] text-muted-foreground tracking-wider px-1.5 py-0.5 border border-border/60 rounded-sm"
                    >
                      {topic.name}
                    </span>
                  ))}
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {t.signatures.length} signatories
                </span>
              </footer>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "font-mono text-[10px] tracking-[0.12em] px-2.5 py-1 border rounded-sm transition-colors " +
        (active
          ? "border-foreground/40 bg-foreground/10 text-foreground"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground")
      }
    >
      {children}
    </Link>
  );
}
