import Link from "next/link";
import { getExplainers } from "@/lib/content";
import { PlainLanguageBox } from "@/components/intel/plain-language-box";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata = { title: "Plain-Language Explainers — Treaty-Lab" };

interface FaqItem {
  q: string;
  a: React.ReactNode;
}

const FAQ_METHODOLOGY: FaqItem[] = [
  {
    q: "What does the claim-kind taxonomy (FACT / RISK / QUESTION / ASSUMPTION / NEEDS VALIDATION) mean?",
    a: (
      <>
        Every claim on a project page is tagged with one of five kinds so readers can immediately
        see how the assessment treats it. <strong>Fact</strong> is directly attested by a cited
        source. <strong>Risk</strong> is an inferred concern based on adjacent facts, not directly
        stated. <strong>Question</strong> is an open issue with no settled answer in the public
        record. <strong>Assumption</strong> is a stated unverified premise. <strong>Needs
        validation</strong> means a community or legal sign-off is pending — typically used for
        confidential agreements or claims that require a Nation's own ratification before they can
        be treated as established.
      </>
    ),
  },
  {
    q: "How is evidence-confidence rated?",
    a: (
      <>
        Evidence-confidence reflects the strength of the <em>public source trail</em> for an
        assessment, not the quality of the project itself. The four levels are:{" "}
        <strong>established</strong> (primary law, treaty text, Supreme Court of Canada decision),{" "}
        <strong>strong</strong> (government reports, peer-reviewed academic work, third-party
        credit ratings), <strong>moderate</strong> (program documentation, regulator market
        snapshots, news), and <strong>weak</strong> (single-source or contested claims). A project
        can have very strong fundamentals and still get a moderate evidence-confidence reading if
        much of its inner workings (financing terms, IBA contents, equity-option specifics) is not
        in the public record.
      </>
    ),
  },
  {
    q: "What is the cumulative-effects doctrine from Yahey, and why does it keep coming up?",
    a: (
      <>
        <em>Yahey v. British Columbia</em> (2021 BCSC 1287) was the first Canadian decision to find
        that the Crown unjustifiably infringed a treaty by allowing the cumulative effects of many
        small approvals to add up to a material loss of treaty rights. The court lowered the
        infringement bar from &quot;no meaningful exercise&quot; (Mikisew, 2005 SCC 69) to{" "}
        <strong>&quot;significant or meaningful diminishment&quot;</strong> and held that the
        regulatory regime <em>itself</em> could be reviewable. The factual basis: by September 2018
        about 85% of Blueberry River First Nations&apos; claim area was within 250 m of an
        industrial disturbance. The doctrine is now being tested outside BC — see Duncan&apos;s
        First Nation v. Alberta — which is why it appears in cross-domain risk indicators.
      </>
    ),
  },
  {
    q: "What is FPIC and where does it come from in Canadian law?",
    a: (
      <>
        <strong>Free, Prior and Informed Consent</strong> is the international standard set out in{" "}
        UNDRIP Articles 19 (for legislative and administrative measures) and 32(2) (for resource
        projects affecting Indigenous lands). Canada endorsed UNDRIP without qualification in 2016
        and passed implementing legislation (the UN Declaration Act, Bill C-15) in 2021; the
        federal 2023–2028 Action Plan commits to developing FPIC-aligned guidance for
        natural-resource project engagement (Measure 32). BC&apos;s DRIPA (2019) implements UNDRIP
        at the provincial level. FPIC is a higher standard than the &quot;duty to consult&quot;
        established in Haida (2004) — but the domestic legal effect of FPIC in Canadian project
        decisions is still being worked out case by case.
      </>
    ),
  },
  {
    q: "Why does Treaty-Lab note that the Alberta Water Act is &quot;silent on Section 35&quot;?",
    a: (
      <>
        A grep of the Alberta Water Act (RSA 2000, c W-3) returns zero occurrences of
        &quot;Aboriginal&quot;, &quot;Indigenous&quot;, &quot;First Nation&quot;, or
        &quot;Treaty.&quot; The Act establishes the first-in-time, first-in-right (FITFIR)
        allocation system but does not directly recognize Section 35 rights — the consultation
        overlay sits in the Alberta Proponent Consultation Guide and common law, outside the
        statute. The Tsuu T&apos;ina Nation v. Alberta (2008 ABQB 547) decision held that Treaties
        6 and 7 do not establish a standalone right to water (though the door was left open for
        water rights ancillary to other treaty rights). This silence is itself a Treaty-Lab finding.
      </>
    ),
  },
  {
    q: "Why is the Cedar LNG project page so much more detailed than Site C or TMX?",
    a: (
      <>
        Cedar LNG has a recent, well-disclosed pre-FID milestone release (Pembina, April 2024) that
        states capital cost (US$3.4B Class III), financing structure (60% project debt / 40%
        equity), EPC consortium (Samsung Heavy Industries + Black &amp; Veatch), financial advisors
        (MUFG + CIBC), and run-rate EBITDA guidance — all things that proponent disclosure laws
        require. Site C and TMX are older Crown-financed projects where the equivalent specifics
        are buried in BC Hydro and Trans Mountain Corporation annual reports, court filings, and
        regulator decisions. The detail asymmetry reflects what is{" "}
        <em>currently in the public record</em>, not what we know about the projects.
      </>
    ),
  },
  {
    q: "How are the pilot projects selected? Why these four?",
    a: (
      <>
        The pilot deliberately spans four contrasting structural archetypes that together cover the
        common Canadian patterns: <strong>Cedar LNG</strong> (Indigenous-majority equity, co-development
        from inception), <strong>Coastal GasLink</strong> (private pipeline with partial Indigenous
        equity options, documented forfeiture case), <strong>Site C</strong> (provincial Crown
        hydroelectric, post-Yahey accommodation), and <strong>TMX</strong> (federal Crown
        acquisition with potential Indigenous divestment). Real production use would replace these
        with the projects each community or analyst actually cares about — the assessment template
        is the asset, not the pilot project list.
      </>
    ),
  },
  {
    q: "How should I read the Cross-Domain Severity Composite on the Command Center?",
    a: (
      <>
        It is a <em>qualitative orientation tool</em>, not a market index. For each domain
        (treaty / water / energy / finance / governance), Treaty-Lab averages the severity rank of
        the indicators tagged to that domain (1 = low, 2 = moderate, 3 = elevated, 4 = high,{" "}
        5 = critical) and plots the result on a radar. Higher score = more pressing exposure in the
        current public record. The composite tells you where to look first; it does not score the
        domain or recommend an action.
      </>
    ),
  },
  {
    q: "Is any of this real-time data?",
    a: (
      <>
        No. All content is curated and version-controlled. The &quot;LIVE&quot; indicator and UTC
        clock in the top bar reflect the terminal&apos;s session state, not live data feeds. The{" "}
        <code>updatedAt</code> field on every indicator and the <code>lastReviewed</code> field on
        every project assessment record when the entry was last reviewed against its sources. A
        production deployment would layer in scheduled re-extraction and human review against the
        underlying public-record changes.
      </>
    ),
  },
  {
    q: "How is the Treaty Archive different from the Evidence Library?",
    a: (
      <>
        The <Link href="/archive" className="underline underline-offset-2">Treaty Archive</Link>{" "}
        holds the actual <em>texts</em> of foundational treaty documents — the Numbered Treaties 1
        through 11, UNDRIP, ILO 169, the UN Charter, the Vienna Convention on the Law of Treaties,
        the Paris Agreement, Geneva IV. These ground the modern Indigenous-rights arguments the
        platform tracks. The{" "}
        <Link href="/evidence" className="underline underline-offset-2">Evidence Library</Link>{" "}
        is broader: it covers every public-record source cited anywhere in the pilot, including
        program documents, court decisions, regulator filings, and academic work. Numbered Treaty
        texts appear in both, with Archive holding the longer text and Library holding the
        annotated supports / limitations metadata.
      </>
    ),
  },
];

export default function ExplainersPage() {
  const explainers = getExplainers();

  return (
    <div className="px-6 py-8 space-y-10 max-w-[1200px] mx-auto">
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

      <section className="pt-6 border-t border-border">
        <div className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
          EXP · FAQ
        </div>
        <h2 className="text-2xl font-semibold tracking-tight mt-1">
          Frequently asked questions about Treaty-Lab&apos;s methodology
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl leading-relaxed">
          Questions about how the terminal works, how claims are graded, and how to read the
          composites. These cover the platform itself rather than any single project.
        </p>
        <Accordion className="mt-6">
          {FAQ_METHODOLOGY.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
              <AccordionContent>
                <div className="text-sm leading-relaxed text-foreground/85 max-w-3xl">
                  {item.a}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
