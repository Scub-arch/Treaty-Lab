"use client";

import { Sankey, Tooltip, ResponsiveContainer, Rectangle, Layer } from "recharts";
import type { ReactElement } from "react";
import type { SankeyData } from "@/lib/content";
import type { SourceType } from "@/lib/content/types";

interface Props {
  data: SankeyData;
}

/** Shared Wong / Okabe-Ito palette — kept in sync with the bar charts. */
const SOURCE_TYPE_PALETTE: Record<SourceType, string> = {
  government_report: "#0072B2",
  court_decision: "#D55E00",
  legislation: "#CC79A7",
  regulatory_filing: "#56B4E9",
  academic: "#009E73",
  news: "#8C564B",
  corporate_disclosure: "#E69F00",
  treaty_text: "#F0E442",
  ngo_report: "#999999",
  financial_prospectus: "#000000",
};

const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  government_report: "Government report",
  court_decision: "Court decision",
  legislation: "Legislation",
  regulatory_filing: "Regulatory filing",
  academic: "Academic",
  news: "News",
  corporate_disclosure: "Corporate disclosure",
  treaty_text: "Treaty text",
  ngo_report: "NGO report",
  financial_prospectus: "Financial prospectus",
};

const PROJECT_COLOR = "#7c3aed"; // violet for the right-side project nodes

// Recharts Sankey custom-renderer props — typed locally because the public
// type exports differ across recharts versions. These match recharts' runtime
// shapes; we accept loose `any` underneath via the parent call site.
interface NodeRendererProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  containerWidth?: number;
  payload?: { name?: string; kind?: "sourceType" | "project"; value?: number };
}

interface LinkRendererProps {
  sourceX?: number;
  sourceY?: number;
  sourceControlX?: number;
  targetX?: number;
  targetY?: number;
  targetControlX?: number;
  linkWidth?: number;
  payload?: { sourceType?: SourceType };
}

function paletteFor(name: string | undefined): string {
  if (!name) return "#aaaaaa";
  return (SOURCE_TYPE_PALETTE as Record<string, string>)[name] ?? "#aaaaaa";
}

function labelFor(name: string | undefined): string {
  if (!name) return "";
  return (SOURCE_TYPE_LABEL as Record<string, string>)[name] ?? name;
}

/**
 * Custom Sankey node renderer — colors source-type nodes by the shared palette,
 * project nodes in a single accent. Labels render outside the rectangle.
 */
function SankeyCustomNode(props: NodeRendererProps): ReactElement {
  const x = props.x ?? 0;
  const y = props.y ?? 0;
  const width = props.width ?? 0;
  const height = props.height ?? 0;
  const containerWidth = props.containerWidth ?? 800;
  const payload = props.payload ?? {};
  const isSourceType = payload.kind === "sourceType";
  const fill = isSourceType ? paletteFor(payload.name) : PROJECT_COLOR;
  const labelText = isSourceType ? labelFor(payload.name) : (payload.name ?? "");

  const labelX = isSourceType ? x - 8 : x + width + 8;
  const labelAnchor: "end" | "start" = isSourceType ? "end" : "start";
  const labelTooLong = !isSourceType && x + width + 8 + labelText.length * 6 > containerWidth - 8;

  return (
    <Layer>
      <Rectangle
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        fillOpacity={0.85}
        stroke={fill}
        strokeOpacity={0.9}
      />
      <text
        x={labelX}
        y={y + height / 2}
        dy="0.35em"
        textAnchor={labelTooLong ? "end" : labelAnchor}
        fontSize={11}
        fill="currentColor"
        fillOpacity={0.85}
      >
        {labelText}
      </text>
      <text
        x={labelX}
        y={y + height / 2 + 14}
        dy="0.35em"
        textAnchor={labelTooLong ? "end" : labelAnchor}
        fontSize={10}
        fill="currentColor"
        fillOpacity={0.5}
        fontFamily="ui-monospace, SF Mono, Menlo, monospace"
      >
        {payload.value ?? 0}
      </text>
    </Layer>
  );
}

/** Custom link renderer — colors each band by its source-type. */
function SankeyCustomLink(props: LinkRendererProps): ReactElement {
  const sourceX = props.sourceX ?? 0;
  const sourceY = props.sourceY ?? 0;
  const sourceControlX = props.sourceControlX ?? 0;
  const targetX = props.targetX ?? 0;
  const targetY = props.targetY ?? 0;
  const targetControlX = props.targetControlX ?? 0;
  const linkWidth = props.linkWidth ?? 0;
  const fill = paletteFor(props.payload?.sourceType);

  return (
    <path
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      stroke={fill}
      strokeOpacity={0.32}
      strokeWidth={linkWidth}
      fill="none"
    />
  );
}

export function CitationSankey({ data }: Props) {
  // Height scales with the larger of the two columns to give each node room
  const leftNodes = data.nodes.filter((n) => n.kind === "sourceType").length;
  const rightNodes = data.nodes.filter((n) => n.kind === "project").length;
  const height = Math.max(280, Math.max(leftNodes, rightNodes) * 48 + 60);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <Sankey
          data={data}
          nodePadding={28}
          nodeWidth={14}
          margin={{ top: 8, right: 160, bottom: 8, left: 160 }}
          link={<SankeyCustomLink />}
          node={<SankeyCustomNode />}
        >
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(20,20,24,0.96)",
              border: "1px solid rgba(120,120,120,0.4)",
              borderRadius: 8,
              fontSize: 12,
              color: "#fafafa",
            }}
            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
            formatter={(value) => [String(value), "citations"]}
          />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}
