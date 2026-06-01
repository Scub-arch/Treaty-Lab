import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getProject, getProjects } from "@/lib/content";
import { DecisionQuestionsForm } from "./questions-form";

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<"/projects/[slug]/questions">) {
  const { slug } = await props.params;
  const p = getProject(slug);
  return {
    title: p ? `Decision questions — ${p.name} — Treaty-Lab` : "Decision questions — Treaty-Lab",
  };
}

export default async function ProjectQuestionsPage(props: PageProps<"/projects/[slug]/questions">) {
  const { slug } = await props.params;
  const project = getProject(slug);
  if (!project) notFound();

  return (
    <div className="px-4 md:px-6 py-6 space-y-5 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/projects/${project.slug}`}
          className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.12em] text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-3 h-3" />
          BACK TO {(project.shortName ?? project.name).toUpperCase()}
        </Link>
      </div>

      <section>
        <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-2">
          DECISION SUPPORT · QUESTIONS
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
          Questions to ask before deciding
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-relaxed">
          Pick the role you are reading as. Treaty-Lab generates the questions that reader should ask
          about <span className="font-medium text-foreground">{project.name}</span> before approving,
          opposing, partnering on, or financing it — grounded in this project&apos;s evidence and open
          items.
        </p>
        <p className="text-[11px] text-muted-foreground mt-2 max-w-3xl leading-relaxed">
          <strong>Not investment advice. Not legal advice.</strong> These are decision-support
          questions, not conclusions. Verify against the cited evidence and qualified counsel.
        </p>
      </section>

      <DecisionQuestionsForm projectSlug={project.slug} projectName={project.name} />
    </div>
  );
}
