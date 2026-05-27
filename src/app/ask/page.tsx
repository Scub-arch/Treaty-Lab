import { getProjects, getModules } from "@/lib/content";
import { AskForm } from "./ask-form";

export const metadata = { title: "Analyst Q&A — Treaty-Lab" };

export default function AskPage() {
  const projects = getProjects();
  const modules = getModules();

  return (
    <div className="px-4 md:px-6 py-6 space-y-5 max-w-[1200px] mx-auto">
      <section>
        <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-2">
          ASK · TREATY
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
          Analyst Q&amp;A
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-relaxed">
          Live LLM grounded in the platform&apos;s evidence library, project assessments, and
          indicators. Pick optional context (a project, a domain) to constrain the answer.
          Backed by the <span className="font-mono">treaty</span> serving endpoint via the
          Databricks AI Gateway.
        </p>
        <p className="text-[11px] text-muted-foreground mt-2 max-w-3xl leading-relaxed">
          <strong>Not investment advice. Not legal advice.</strong> Plain-language synthesis of
          public-record evidence only. Verify with qualified counsel before any operative use.
        </p>
      </section>

      <AskForm
        projects={projects.map((p) => ({ slug: p.slug, name: p.name }))}
        domains={modules.map((m) => ({ slug: m.slug, title: m.title }))}
      />
    </div>
  );
}
