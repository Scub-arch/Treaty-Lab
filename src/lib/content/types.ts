// Treaty-Lab content schema.
//
// All sample data in src/content/*.json conforms to these types.
// Wording principles (from project brief): separate confirmed facts from risks,
// questions, assumptions, and items needing legal/community validation.

export type Severity = "low" | "moderate" | "elevated" | "high" | "critical";
export type Trend = "improving" | "stable" | "deteriorating" | "unknown";
export type EvidenceStrength = "weak" | "moderate" | "strong" | "established";
export type SourceType =
  | "court_decision"
  | "legislation"
  | "treaty_text"
  | "regulatory_filing"
  | "government_report"
  | "academic"
  | "news"
  | "ngo_report"
  | "corporate_disclosure"
  | "financial_prospectus";

export type ProjectStatus =
  | "proposed"
  | "in_review"
  | "approved"
  | "under_construction"
  | "operational"
  | "paused"
  | "litigated"
  | "cancelled";

export type Domain = "treaty" | "water" | "energy" | "finance" | "governance";

export interface SourceReference {
  /** Slug of an EvidenceItem in evidence.json */
  evidenceSlug: string;
  /** What this source is being cited for, in this context */
  citing: string;
}

/** A separated, attributed claim. The brief requires evidence traceability. */
export interface Claim {
  text: string;
  /** "fact" = directly attested; "risk" = inferred concern; "question" = open;
   *  "assumption" = noted unverified premise; "needs_validation" = community/legal sign-off pending */
  kind: "fact" | "risk" | "question" | "assumption" | "needs_validation";
  sources?: SourceReference[];
}

export interface Indicator {
  slug: string;
  /** Which intelligence module this belongs to */
  domain: Domain;
  name: string;
  /** Short summary line displayed on cards */
  summary: string;
  /** Either a numeric value with unit, or a qualitative label */
  value: string;
  /** Numeric reading for sparklines/sorting if applicable */
  numericValue?: number;
  unit?: string;
  severity: Severity;
  trend: Trend;
  /** Plain-language note on how to read this indicator */
  note?: string;
  sources?: SourceReference[];
  updatedAt: string; // ISO date
}

export interface EvidenceItem {
  slug: string;
  title: string;
  sourceType: SourceType;
  /** Citation-style author/issuing body */
  author?: string;
  publishedAt?: string; // ISO date or YYYY
  url?: string;
  /** Where to find this in print, if no URL */
  citation?: string;
  /** Reliability: 'established' = primary law/SCC/treaty text; 'strong' = peer-reviewed/govt; 'moderate' = reputable news; 'weak' = single-source or contested */
  reliability: EvidenceStrength;
  /** Topical tags for filtering: 'law','finance','water','power','government','community','market','company' */
  tags: string[];
  /** What this source actually supports — keeps citation honest */
  supports: string[];
  /** Known limitations of this source */
  limitations?: string[];
  /** A short summary written for non-specialists */
  plainSummary: string;
}

export interface PartyReference {
  /** Full party name, e.g. "Wet'suwet'en Hereditary Chiefs", "TC Energy Corp" */
  name: string;
  /** Role: 'proponent','consenting_first_nation','contesting_first_nation','regulator','financier','government','affected_community' */
  role: string;
  /** Optional URL to that party's primary public statement on the project */
  statementUrl?: string;
}

export interface ProjectFinance {
  /** e.g. "Federal Crown corporation", "Indigenous-majority equity (Haisla 50.1%)", "CIB loan guarantee" */
  structure: string;
  totalCostEstimate?: string;
  costOverrunsNoted?: string;
  loanGuarantor?: string;
  /** Plain-language summary of who carries the residual risk if the project fails */
  riskCarrier: string;
  sources?: SourceReference[];
}

/** DATA-002: a treaty a project operates under, resolved from the registry. */
export interface RelatedTreatyRef {
  slug: string;
  name: string;
  shortName?: string;
}

export interface ProjectAssessment {
  slug: string;
  name: string;
  shortName?: string;
  status: ProjectStatus;
  /** One-sentence what-it-is */
  summary: string;
  /** Geography */
  location: string;
  jurisdictions: string[]; // e.g. ["British Columbia", "Federal Canada"]
  /** Project proponent (corporate / crown / consortium) */
  proponent: string;
  /** Government objective for the project — what the policy aim is */
  governmentObjective: string;
  /** Private-sector or proponent objective */
  proponentObjective: string;
  /** Affected First Nations and other parties */
  parties: PartyReference[];
  /** First Nation implications, separated by claim kind */
  firstNationImplications: Claim[];
  /** Treaty & water risk claims */
  treatyAndWaterRisk: Claim[];
  /** Finance risk claims */
  financeRisk: Claim[];
  /** Open governance questions */
  governanceQuestions: string[];
  /** Recommended questions communities should ask before approval / when negotiating */
  recommendedCommunityQuestions: string[];
  /** Overall finance summary */
  finance: ProjectFinance;
  /** Evidence-library slugs that ground this assessment */
  primarySources: SourceReference[];
  /** Confidence in the overall assessment: not a rating of the project, a rating of how solid the public-source evidence trail is */
  evidenceConfidence: EvidenceStrength;
  /** Domains relevant to this project (used to surface it under Water/Energy/Finance/Treaty pages) */
  domains: Domain[];
  /** ISO date last reviewed */
  lastReviewed: string;
  /** DATA-002 seed input: slugs of treaties this project operates under (registry slugs). */
  relatedTreatySlugs?: string[];
  /** DATA-002 runtime: resolved treaty refs, populated from the registry by content.ts. */
  relatedTreaties?: RelatedTreatyRef[];
}

export interface PlainLanguageExplainer {
  slug: string;
  question: string;
  /** Short 1-2 sentence answer */
  shortAnswer: string;
  /** Full plain-language body (markdown) */
  body: string;
  /** Optional related evidence */
  relatedEvidence?: string[];
  /** Optional related projects */
  relatedProjects?: string[];
}

/** Per-module landing-page header content for Treaty / Water / Energy / Finance */
export interface ModuleConfig {
  slug: Domain;
  title: string;
  tagline: string;
  /** Lede paragraph describing this module's intelligence focus */
  lede: string;
  /** Slugs of indicators to feature on this module's landing page */
  featuredIndicatorSlugs: string[];
  /** Slugs of projects to surface on this module's landing page */
  featuredProjectSlugs: string[];
}
