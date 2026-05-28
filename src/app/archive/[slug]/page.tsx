import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { IntelligencePanel } from "@/components/intel/intelligence-panel";

export async function generateStaticParams() {
  const treaties = await prisma.treaty.findMany({ select: { slug: true } });
  return treaties.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata(props: PageProps<"/archive/[slug]">) {
  const { slug } = await props.params;
  const t = await prisma.treaty.findUnique({ where: { slug } });
  return { title: t ? `${t.name} — Treaty Archive` : "Treaty — Treaty-Lab" };
}

export default async function TreatyDetail(props: PageProps<"/archive/[slug]">) {
  const { slug } = await props.params;
  const treaty = await prisma.treaty.findUnique({
    where: { slug },
    include: {
      topics: true,
      signatures: { include: { party: true }, orderBy: { signedAt: "asc" } },
    },
  });
  if (!treaty) notFound();

  const opened = treaty.openedAt.toISOString().slice(0, 10);
  const inForce = treaty.enteredIntoForceAt?.toISOString().slice(0, 10);

  return (
    <div className="px-6 py-8 space-y-8 max-w-[1200px] mx-auto">
      <Link
        href="/archive"
        className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.12em] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="w-3 h-3" />
        BACK TO ARCHIVE
      </Link>

      <header>
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
          ARC · {treaty.shortName?.toUpperCase() ?? treaty.openedAt.getFullYear()}
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight mt-2">
          {treaty.name}
        </h1>
        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-y-2 gap-x-6 text-sm text-muted-foreground mt-4 font-mono">
          <div>
            <dt className="text-[10px] tracking-[0.12em] uppercase">Opened</dt>
            <dd>{opened}</dd>
          </div>
          {inForce && (
            <div>
              <dt className="text-[10px] tracking-[0.12em] uppercase">Entered into force</dt>
              <dd>{inForce}</dd>
            </div>
          )}
          {treaty.depository && (
            <div>
              <dt className="text-[10px] tracking-[0.12em] uppercase">Depository</dt>
              <dd>{treaty.depository}</dd>
            </div>
          )}
        </dl>
      </header>

      <p className="text-base text-foreground/90 leading-relaxed max-w-3xl">{treaty.summary}</p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6 min-w-0">
          <IntelligencePanel
            title="Text"
            code="ARC · TEXT"
            subtitle="Crown / institutional version. Indigenous oral histories may differ materially."
          >
            <div className="prose-tl whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {treaty.fullText}
            </div>
            {treaty.sourceUrl && (
              <div className="mt-4 pt-4 border-t border-border">
                <a
                  href={treaty.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[10px] tracking-[0.12em] text-foreground/80 hover:text-foreground inline-flex items-center gap-1"
                >
                  VIEW ORIGINAL SOURCE
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </IntelligencePanel>
        </div>

        <aside className="space-y-6">
          <IntelligencePanel title="Topics" code="ARC · TPC">
            <ul className="flex flex-wrap gap-1.5">
              {treaty.topics.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/archive?topic=${t.slug}`}
                    className="font-mono text-[10px] text-muted-foreground tracking-wider px-1.5 py-0.5 border border-border rounded-sm hover:border-foreground/30 hover:text-foreground"
                  >
                    {t.name}
                  </Link>
                </li>
              ))}
            </ul>
          </IntelligencePanel>

          <IntelligencePanel title="Signatories" code="ARC · SIG">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground font-medium pb-2">
                    PARTY
                  </th>
                  <th className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground font-medium pb-2">
                    SIGNED
                  </th>
                </tr>
              </thead>
              <tbody>
                {treaty.signatures.map((s) => (
                  <tr key={s.id} className="border-b border-border/40 last:border-0">
                    <td className="py-2 text-sm">
                      <div className="font-medium">{s.party.name}</div>
                      {s.reservation && (
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          With reservation: {s.reservation}
                        </div>
                      )}
                    </td>
                    <td className="py-2 font-mono text-xs text-muted-foreground">
                      {s.signedAt ? s.signedAt.toISOString().slice(0, 10) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </IntelligencePanel>
        </aside>
      </div>
    </div>
  );
}
