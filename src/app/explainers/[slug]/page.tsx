import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Lightbulb } from "lucide-react";
import {
  getExplainer,
  getExplainers,
  getEvidenceItem,
  getProject,
} from "@/lib/content";

export function generateStaticParams() {
  return getExplainers().map((e) => ({ slug: e.slug }));
}

export async function generateMetadata(props: PageProps<"/explainers/[slug]">) {
  const { slug } = await props.params;
  const e = getExplainer(slug);
  return { title: e ? `${e.question} — Treaty-Lab` : "Explainer — Treaty-Lab" };
}

export default async function ExplainerDetail(props: PageProps<"/explainers/[slug]">) {
  const { slug } = await props.params;
  const item = getExplainer(slug);
  if (!item) notFound();

  return (
    <div className="px-6 py-8 space-y-8 max-w-3xl mx-auto">
      <Link
        href="/explainers"
        className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.12em] text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="w-3 h-3" />
        BACK TO EXPLAINERS
      </Link>

      <header>
        <div className="flex items-center gap-2 mb-2 text-amber-400">
          <Lightbulb className="w-4 h-4" />
          <span className="font-mono text-[10px] tracking-[0.15em]">PLAIN LANGUAGE</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
          {item.question}
        </h1>
        <p className="text-base text-muted-foreground mt-4 leading-relaxed">
          {item.shortAnswer}
        </p>
      </header>

      <article className="prose-tl">
        {item.body.split(/\n\n+/).map((para, i) => {
          // Render bold-prefixed paragraphs as definition-style blocks.
          if (para.startsWith("**")) {
            const match = para.match(/^\*\*([^*]+)\*\* — ([\s\S]*)$/);
            if (match) {
              return (
                <p key={i} className="leading-relaxed text-sm">
                  <span className="font-semibold text-foreground">{match[1]}</span>{" "}
                  <span className="text-muted-foreground">— {match[2]}</span>
                </p>
              );
            }
          }
          return (
            <p key={i} className="leading-relaxed text-sm text-foreground/90">
              {para}
            </p>
          );
        })}
      </article>

      {item.relatedEvidence && item.relatedEvidence.length > 0 && (
        <section className="pt-4 border-t border-border">
          <div className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground mb-3">
            RELATED EVIDENCE
          </div>
          <ul className="space-y-1.5 text-sm">
            {item.relatedEvidence.map((s) => {
              const e = getEvidenceItem(s);
              return e ? (
                <li key={s}>
                  →{" "}
                  <Link
                    href={`/evidence/${s}`}
                    className="hover:underline underline-offset-2"
                  >
                    {e.title}
                  </Link>
                </li>
              ) : null;
            })}
          </ul>
        </section>
      )}

      {item.relatedProjects && item.relatedProjects.length > 0 && (
        <section className="pt-4 border-t border-border">
          <div className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground mb-3">
            RELATED PROJECTS
          </div>
          <ul className="space-y-1.5 text-sm">
            {item.relatedProjects.map((s) => {
              const p = getProject(s);
              return p ? (
                <li key={s}>
                  →{" "}
                  <Link
                    href={`/projects/${s}`}
                    className="hover:underline underline-offset-2"
                  >
                    {p.name}
                  </Link>
                </li>
              ) : null;
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
