// RPT-002 — build a Word (.docx) export of a project assessment.
//
// Pure module: takes a ProjectAssessment plus the evidence library (to resolve
// `evidenceSlug` citations to titles/URLs) and returns the .docx bytes. No DB or
// content-layer import here, so it can be unit-tested with fixture data.
//
// Typography mirrors the prior `.docx` reports: Calibri 11 body, black headings,
// thin-ruled tables.

import {
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Claim, EvidenceItem, ProjectAssessment, SourceReference } from "@/lib/content/types";

const BODY_FONT = "Calibri";
const BODY_SIZE = 22; // half-points => 11pt
const MUTED = "595959";
const BLACK = "1A1A1A";

const KIND_LABEL: Record<Claim["kind"], string> = {
  fact: "FACT",
  risk: "RISK",
  question: "QUESTION",
  assumption: "ASSUMPTION",
  needs_validation: "NEEDS VALIDATION",
};

// Hex (no #) roughly matching the on-screen claim-kind colours.
const KIND_COLOR: Record<Claim["kind"], string> = {
  fact: "047857",
  risk: "C2410C",
  question: "0369A1",
  assumption: "52525B",
  needs_validation: "B45309",
};

function heading(
  text: string,
  level: (typeof HeadingLevel)[keyof typeof HeadingLevel],
  pageBreakBefore = false,
): Paragraph {
  return new Paragraph({
    heading: level,
    pageBreakBefore,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, color: BLACK })],
  });
}

function label(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 120, after: 40 },
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, color: MUTED, size: 16, allCaps: true }),
    ],
  });
}

function body(text: string): Paragraph {
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun(text)] });
}

function bullet(children: (TextRun | ExternalHyperlink)[]): Paragraph {
  return new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children });
}

function claimBlock(claim: Claim, evBySlug: Map<string, EvidenceItem>): Paragraph[] {
  const out: Paragraph[] = [
    new Paragraph({
      spacing: { before: 100, after: 20 },
      children: [
        new TextRun({
          text: `[${KIND_LABEL[claim.kind]}] `,
          bold: true,
          color: KIND_COLOR[claim.kind],
          size: 18,
        }),
        new TextRun({ text: claim.text }),
      ],
    }),
  ];
  for (const s of claim.sources ?? []) {
    out.push(
      new Paragraph({
        indent: { left: 360 },
        spacing: { after: 20 },
        children: sourceRun(s, evBySlug, "→ "),
      }),
    );
  }
  return out;
}

function sourceRun(
  s: SourceReference,
  evBySlug: Map<string, EvidenceItem>,
  prefix = "",
): (TextRun | ExternalHyperlink)[] {
  const ev = evBySlug.get(s.evidenceSlug);
  const labelText = ev?.title ?? s.evidenceSlug;
  const cite = new TextRun({
    text: `${prefix}${s.citing} — `,
    italics: true,
    size: 18,
    color: MUTED,
  });
  if (ev?.url) {
    return [
      cite,
      new ExternalHyperlink({
        link: ev.url,
        children: [new TextRun({ text: labelText, style: "Hyperlink", size: 18 })],
      }),
    ];
  }
  return [cite, new TextRun({ text: labelText, size: 18, color: MUTED })];
}

function thinCell(children: Paragraph[], widthPct: number): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children,
  });
}

function sourcesTable(refs: SourceReference[], evBySlug: Map<string, EvidenceItem>): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      thinCell([label("Source")], 45),
      thinCell([label("Cited for")], 40),
      thinCell([label("Reliability")], 15),
    ],
  });
  const rows = refs.map((s) => {
    const ev = evBySlug.get(s.evidenceSlug);
    return new TableRow({
      children: [
        thinCell(
          [
            new Paragraph({
              children: ev?.url
                ? [
                    new ExternalHyperlink({
                      link: ev.url,
                      children: [
                        new TextRun({
                          text: ev?.title ?? s.evidenceSlug,
                          style: "Hyperlink",
                          size: 18,
                        }),
                      ],
                    }),
                  ]
                : [new TextRun({ text: ev?.title ?? s.evidenceSlug, size: 18 })],
            }),
          ],
          45,
        ),
        thinCell([new Paragraph({ children: [new TextRun({ text: s.citing, size: 18 })] })], 40),
        thinCell(
          [new Paragraph({ children: [new TextRun({ text: ev?.reliability ?? "—", size: 18 })] })],
          15,
        ),
      ],
    });
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: "D4D4D4" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "D4D4D4" },
      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "ECECEC" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
    },
    rows: [headerRow, ...rows],
  });
}

const DISCLAIMER =
  "This document is a research-intelligence export. It is not legal advice or investment " +
  "advice. Claims are drawn from public-record sources cited inline; items marked NEEDS " +
  "VALIDATION require community or legal sign-off. Indigenous oral histories of treaty intent " +
  "may differ materially from the institutional record. Verify the cited evidence directly.";

/** Build the .docx byte stream for a project assessment. */
export async function buildProjectReport(
  project: ProjectAssessment,
  evidence: EvidenceItem[],
  generatedOn: string,
): Promise<Buffer> {
  const evBySlug = new Map(evidence.map((e) => [e.slug, e]));
  const allClaims: Claim[] = [
    ...project.firstNationImplications,
    ...project.treatyAndWaterRisk,
    ...project.financeRisk,
  ];
  // Evidence appendix = every evidence item this project actually cites.
  const citedSlugs = new Set<string>();
  for (const s of project.primarySources) citedSlugs.add(s.evidenceSlug);
  for (const c of allClaims) for (const s of c.sources ?? []) citedSlugs.add(s.evidenceSlug);
  for (const s of project.finance.sources ?? []) citedSlugs.add(s.evidenceSlug);
  const citedEvidence = [...citedSlugs]
    .map((slug) => evBySlug.get(slug))
    .filter((e): e is EvidenceItem => Boolean(e));

  const children: (Paragraph | Table)[] = [];

  // --- Title page ---
  children.push(
    new Paragraph({
      spacing: { before: 1200, after: 0 },
      children: [
        new TextRun({
          text: "TREATY-LAB · PROJECT ASSESSMENT",
          bold: true,
          color: MUTED,
          size: 18,
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 80, after: 0 },
      children: [new TextRun({ text: project.name, bold: true, color: BLACK, size: 52 })],
    }),
    new Paragraph({
      spacing: { before: 60, after: 0 },
      children: [new TextRun({ text: project.summary, italics: true, color: MUTED })],
    }),
    new Paragraph({
      spacing: { before: 240, after: 0 },
      children: [new TextRun({ text: `Generated ${generatedOn}`, color: MUTED, size: 18 })],
    }),
    new Paragraph({
      spacing: { before: 600, after: 0 },
      children: [new TextRun({ text: DISCLAIMER, italics: true, color: MUTED, size: 18 })],
    }),
  );

  // --- Overview block (page break carried by the heading itself, so page 2
  // opens directly on the heading with no stray empty paragraph) ---
  children.push(heading("Overview", HeadingLevel.HEADING_1, true));
  const overview: [string, string][] = [
    ["Status", project.status.replace(/_/g, " ")],
    ["Location", project.location],
    ["Jurisdictions", project.jurisdictions.join(", ")],
    ["Proponent", project.proponent],
    ["Evidence confidence", project.evidenceConfidence],
    ["Last reviewed", project.lastReviewed],
  ];
  if (project.relatedTreaties && project.relatedTreaties.length > 0) {
    overview.push([
      "Operates under",
      project.relatedTreaties.map((t) => t.shortName ?? t.name).join(", "),
    ]);
  }
  for (const [k, v] of overview) {
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: `${k}: `, bold: true }), new TextRun({ text: v })],
      }),
    );
  }

  // --- Objectives ---
  children.push(heading("Objectives", HeadingLevel.HEADING_1));
  children.push(label("Government objective"), body(project.governmentObjective));
  children.push(label("Proponent objective"), body(project.proponentObjective));

  // --- Parties tracked (mirrors the on-page "Parties tracked" panel) ---
  if (project.parties.length > 0) {
    children.push(heading("Parties tracked", HeadingLevel.HEADING_1));
    for (const p of project.parties) {
      const runs: (TextRun | ExternalHyperlink)[] = [
        new TextRun({ text: p.name, bold: true }),
        new TextRun({ text: ` — ${p.role.replace(/_/g, " ")}`, color: MUTED, size: 18 }),
      ];
      if (p.statementUrl) {
        runs.push(
          new TextRun({ text: "  ", size: 18 }),
          new ExternalHyperlink({
            link: p.statementUrl,
            children: [new TextRun({ text: "statement", style: "Hyperlink", size: 18 })],
          }),
        );
      }
      children.push(bullet(runs));
    }
  }

  // --- Claim sections (colour-coded by kind) ---
  const claimSections: [string, Claim[]][] = [
    ["First Nation implications", project.firstNationImplications],
    ["Treaty & water risk", project.treatyAndWaterRisk],
    ["Finance risk", project.financeRisk],
  ];
  for (const [title, claims] of claimSections) {
    if (claims.length === 0) continue;
    children.push(heading(title, HeadingLevel.HEADING_1));
    for (const c of claims) children.push(...claimBlock(c, evBySlug));
  }

  // --- Finance ---
  children.push(heading("Finance", HeadingLevel.HEADING_1));
  const fin = project.finance;
  const finRows: [string, string | undefined][] = [
    ["Structure", fin.structure],
    ["Total cost estimate", fin.totalCostEstimate],
    ["Cost overruns noted", fin.costOverrunsNoted],
    ["Loan guarantor", fin.loanGuarantor],
    ["Risk carrier", fin.riskCarrier],
  ];
  for (const [k, v] of finRows) {
    if (!v) continue;
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: `${k}: `, bold: true }), new TextRun({ text: v })],
      }),
    );
  }
  // Finance citations carry their "cited for" rationale like every other claim
  // surface (claimBlock / sourcesTable), rather than only surfacing in the appendix.
  for (const s of fin.sources ?? []) {
    children.push(
      new Paragraph({
        indent: { left: 360 },
        spacing: { after: 20 },
        children: sourceRun(s, evBySlug, "→ "),
      }),
    );
  }

  // --- Governance / community questions ---
  if (project.governanceQuestions.length > 0) {
    children.push(heading("Open governance questions", HeadingLevel.HEADING_1));
    for (const q of project.governanceQuestions) children.push(bullet([new TextRun(q)]));
  }
  if (project.recommendedCommunityQuestions.length > 0) {
    children.push(heading("Recommended community questions", HeadingLevel.HEADING_1));
    for (const q of project.recommendedCommunityQuestions) children.push(bullet([new TextRun(q)]));
  }

  // --- Primary sources table ---
  if (project.primarySources.length > 0) {
    children.push(heading("Primary sources", HeadingLevel.HEADING_1));
    children.push(sourcesTable(project.primarySources, evBySlug));
  }

  // --- Evidence appendix ---
  if (citedEvidence.length > 0) {
    children.push(heading("Evidence appendix", HeadingLevel.HEADING_1));
    for (const e of citedEvidence) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 20 },
          children: e.url
            ? [
                new ExternalHyperlink({
                  link: e.url,
                  children: [new TextRun({ text: e.title, bold: true, style: "Hyperlink" })],
                }),
              ]
            : [new TextRun({ text: e.title, bold: true })],
        }),
        new Paragraph({
          spacing: { after: 20 },
          children: [
            new TextRun({
              text: `${e.sourceType.replace(/_/g, " ")} · ${e.reliability}`,
              size: 18,
              color: MUTED,
            }),
          ],
        }),
        body(e.plainSummary),
      );
    }
  }

  const doc = new Document({
    creator: "Treaty-Lab",
    title: `${project.name} — Project Assessment`,
    description: "Treaty-Lab project assessment export",
    styles: {
      default: { document: { run: { font: BODY_FONT, size: BODY_SIZE, color: BLACK } } },
    },
    sections: [
      {
        properties: { page: { margin: { top: 1100, bottom: 1100, left: 1100, right: 1100 } } },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
