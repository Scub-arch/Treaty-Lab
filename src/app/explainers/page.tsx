import { getExplainers } from "@/lib/content";
import { PlainLanguageBox } from "@/components/intel/plain-language-box";

export const metadata = { title: "Plain-Language Explainers — Treaty-Lab" };

export default function ExplainersPage() {
  const explainers = getExplainers();

  return (
    <div className="px-6 py-8 space-y-8 max-w-[1200px] mx-auto">
      <section>
        <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-3">
          EXP · INDEX
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
          Plain-Language Explainers
        </h1>
        <p className="text-base text-muted-foreground mt-3 max-w-3xl leading-relaxed">
          Finance, governance, and legal concepts translated into language that supports community
          decision-making. Written to be useful to people who do not have a law or finance degree
          and who need to understand what is actually at stake before signing or negotiating.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {explainers.map((e) => (
          <PlainLanguageBox key={e.slug} explainer={e} />
        ))}
      </section>
    </div>
  );
}
