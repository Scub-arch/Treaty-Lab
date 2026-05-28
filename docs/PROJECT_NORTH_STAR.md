# Treaty-Lab — Project North Star

> The product thesis, target users, core flow, and standards that every
> page, component, and content file in this repository should reinforce.
> When in doubt about a design or wording choice, defer to this document.

---

## 1. Product thesis

**Treaty-Lab is a source-backed Indigenous infrastructure intelligence
terminal that helps communities, analysts, leadership, and advisors
understand project risk before decisions are made.**

It is not a generic dashboard, not a news site, not a legal accusation
tool, not an unsourced AI assistant, and not a replacement for legal,
financial, or community counsel. It is a structured way to take scattered
public-record information about an infrastructure project and present it
in a form that supports a decision.

---

## 2. Core advantage

**Traceable evidence + plain-language risk analysis + project decision
support.**

Three things have to hold together for the product to mean anything:

- **Traceable evidence.** Every important claim is connected back to a
  named public-record source with a confidence rating and a record of
  what the source actually supports.
- **Plain-language risk analysis.** Complex legal, financial,
  regulatory, technical, and policy material is translated into clear,
  decision-useful language without weakening accuracy.
- **Project decision support.** The output is structured around the
  questions a community, analyst, or advisor would ask before approving,
  opposing, partnering on, or financing a project.

If any one of these breaks, the product reverts to a generic dashboard.

---

## 3. Target users

Treaty-Lab is built for the people who actually have to make or inform
a decision about an infrastructure project on or near treaty land:

- **Community members** — band members, elders, youth, knowledge keepers.
- **Analysts** — internal or external researchers preparing community
  briefings or technical reviews.
- **Chief and Council / leadership** — the people accountable for the
  decision.
- **Advisors** — economic development corporations, treaty-rights
  liaisons, consultation coordinators.
- **Legal or policy reviewers** — counsel and policy researchers
  validating claims against statutes, case law, and the regulatory
  record.
- **Infrastructure and finance reviewers** — proponents, lenders,
  insurers, ESG and consultation diligence teams.
- **Researchers** working on Indigenous rights, water, energy, and
  project-risk analysis more broadly.

Different surfaces in the app serve different combinations of these
users. The plain-language explainers and decision-support questions
should always be readable by a community member without specialist
training. The deeper evidence cards and aggregation charts can assume
analyst literacy.

---

## 4. Core product flow

Every major surface should reinforce the same five-step model:

```
Claim → Source → Risk → Plain-language explanation → Decision support
```

1. **Claim.** A specific, attributable statement about a project, a
   treaty obligation, a water allocation, a financing structure, or a
   consultation step.
2. **Source.** A named public-record document that the claim is drawn
   from, with a confidence rating and a record of what the source
   actually supports (and what it does not).
3. **Risk.** A clear statement of the concern, exposure, or open
   question the claim raises — separated from fact.
4. **Plain-language explanation.** A short, jargon-free translation
   for community readers.
5. **Decision support.** The next questions to ask, the items that
   need community or legal review, the gaps that must be closed before
   a decision is made.

A page that shows claims without sources is broken. A page that shows
sources without translating their implications into plain language is
inaccessible. A page that translates and analyses without ending in a
decision-relevant question is not Treaty-Lab.

---

## 5. Non-goals

Treaty-Lab is explicitly **not** any of the following:

- A generic infrastructure news site or aggregator.
- A legal accusation tool or activism page.
- An unsourced AI dashboard.
- A replacement for legal advice, investment advice, or community
  consent processes.
- A neutral platform for proponent marketing material.

The product should refuse to drift into these modes even when the
underlying data could support them.

---

## 6. Evidence standards

Every claim that materially affects a project's risk profile should be
connected to:

- **A named source** (court decision, statute, regulatory filing,
  government report, financial disclosure, peer-reviewed paper, etc.).
- **A source type** (`court_decision`, `legislation`, `treaty_text`,
  `regulatory_filing`, `government_report`, `academic`, `news`,
  `ngo_report`, `corporate_disclosure`, `financial_prospectus`).
- **A reliability tier** (`established`, `strong`, `moderate`, `weak`).
- **A claim status** (`fact`, `risk`, `question`, `assumption`,
  `needs_validation`).

Where evidence is missing, contested, or only available behind closed
processes (e.g. specific IBA terms), the product should say so
explicitly rather than infer or fabricate. The `needs_validation`
status exists for exactly this case — a claim that may be true but
needs community or legal sign-off before it can be relied on.

---

## 7. Plain-language standard

Complex legal, financial, regulatory, technical, and policy information
should be translated into clear, decision-useful language without
weakening accuracy.

In practice this means:

- Short sentences. Concrete nouns. Active verbs.
- Define jargon on first use; don't assume specialist vocabulary.
- Prefer "the federal loan-guarantee program for Indigenous equity"
  over the acronym "CIB" on first reference.
- Use the same plain language in cards, headings, and chart labels —
  not just in dedicated explainers.
- When a source's wording itself matters (treaty language, statutory
  text, a court holding), quote it directly and translate it
  separately.

A community member without specialist training should be able to read
a project assessment and understand what is at stake without needing
a glossary.

---

## 8. Safe wording standard

The software must clearly separate, on every surface that displays
project information:

| Category                           | Treatment                                                           |
| ---------------------------------- | ------------------------------------------------------------------- |
| **Confirmed facts**                | Stated directly, with source attached.                              |
| **Source-backed analysis**         | Framed as analysis, not assertion; sources cited.                   |
| **Reasonable inference**           | Framed as inference, with the underlying basis named.               |
| **Unresolved questions**           | Surfaced as questions, not as conclusions.                          |
| **Evidence gaps**                  | Surfaced as gaps; the missing source is named where known.          |
| **Counsel / community review**     | Flagged as `needs_validation`; community or counsel sign-off noted. |

Wording to use:

- _risk_, _concern_, _evidence gap_, _unresolved question_,
  _requires review_, _source-backed analysis_,
  _community validation required_, _counsel review required_,
  _decision-support question_.

Wording to avoid:

- Unsupported accusations.
- Claims of illegality without direct source support.
- Statements that communities or leaders acted improperly unless
  directly sourced and legally safe.
- Emotional framing that weakens credibility.
- Software-capability overpromises.
- Inference presented as fact.

---

## 9. Required project page structure

A strong Treaty-Lab project page should include, at minimum:

1. **Project overview** — what it is, who is building it, what stage.
2. **Affected communities / treaty area** — where supported by sources.
3. **Companies and government actors** — proponent, regulators,
   financiers, with named roles.
4. **Water exposure** — watershed, allocation, drought sensitivity.
5. **Power / grid exposure** — interconnection, load growth, stranded-
   asset concerns.
6. **Finance / ownership structure** — equity, debt, loan guarantees,
   who carries the residual risk.
7. **Consultation and governance status** — what has been done, what
   is outstanding.
8. **Risk summary** — separated into facts, risks, questions,
   assumptions, and items needing validation.
9. **Evidence / source map** — every claim's named source, with
   reliability and source type visible.
10. **Missing information** — what the public record does not contain.
11. **Questions to ask before approval** — decision-support prompts
    for community, advisor, and counsel review.
12. **Decision-support summary** — what this project page actually
    helps the reader decide.

Not every project page in the pilot covers every section today; the
project content schema (`src/lib/content/types.ts`) already supports
this structure, and the roadmap below tracks the gaps.

---

## 10. Future roadmap

Prioritised in roughly the order that strengthens the core advantage:

1. **Stronger project records** — every pilot project covers all 12
   sections above with source-backed content.
2. **Claim-level source tracing** — every individual claim displays
   its source inline, not only in a "primary sources" footer.
3. **Evidence confidence labels everywhere** — reliability and source
   type are visible on every claim, not only in the Evidence Library.
4. **Risk classification** — a consistent severity / category schema
   applied across treaty, water, energy, finance, and governance
   surfaces.
5. **Plain-language explainers** — expand coverage of finance,
   regulatory, and consultation concepts so every cited program has
   a plain-language card.
6. **Exportable community briefings** — on-demand `.docx` exports of
   project assessments, formatted for community meetings and Council
   packages.
7. **Source maps** — visual graphs that show how a single source
   propagates across projects, indicators, and explainers.
8. **Decision-question generators** — given a project + a user role,
   produce the next ten questions that should be asked before
   approval, partnership, financing, or opposition.
9. **Secure roles and permissions** for public vs internal material —
   so a community can keep its own draft analysis private until ready
   for release, and external advisors see only what they need.

---

## How to use this document

- When you propose a new feature, write a one-sentence justification
  that begins "This supports the north star by…"
- When you write new copy for the app, check it against §7 and §8
  before merging.
- When you add a new source, check it against §6.
- When you build a new project page, check it against §9.
- When you scope a new sprint, check the order against §10.

_Last updated: 2026-05-27._
