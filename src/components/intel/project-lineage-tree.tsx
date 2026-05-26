import { hierarchy, tree, type HierarchyPointNode } from "d3-hierarchy";
import type { ProjectAssessment } from "@/lib/content/types";
import { getEvidenceItem } from "@/lib/content";

interface TreeNode {
  id: string;
  label: string;
  kind: "root" | "group" | "party" | "source";
  /** Optional supplementary text rendered under the label */
  sub?: string;
  /** Optional href for leaves */
  href?: string;
  /** Optional role-derived emphasis class for party leaves */
  emphasis?: "contesting" | "consenting" | "neutral";
  children?: TreeNode[];
}

function buildTree(project: ProjectAssessment): TreeNode {
  const partyEmphasis = (role: string): "contesting" | "consenting" | "neutral" => {
    if (role.startsWith("contesting")) return "contesting";
    if (role.startsWith("consenting")) return "consenting";
    return "neutral";
  };

  return {
    id: project.slug,
    label: project.name,
    kind: "root",
    sub: project.shortName ?? project.status.replace(/_/g, " "),
    children: [
      {
        id: "parties-group",
        label: "Parties",
        kind: "group",
        sub: `${project.parties.length} tracked`,
        children: project.parties.map((p, i) => ({
          id: `party-${i}`,
          label: p.name,
          kind: "party" as const,
          sub: p.role.replace(/_/g, " "),
          emphasis: partyEmphasis(p.role),
        })),
      },
      {
        id: "sources-group",
        label: "Primary Sources",
        kind: "group",
        sub: `${project.primarySources.length} cited`,
        children: project.primarySources.map((s, i) => {
          const e = getEvidenceItem(s.evidenceSlug);
          return {
            id: `source-${i}`,
            label: e?.title ?? s.evidenceSlug,
            kind: "source" as const,
            sub: s.citing,
            href: `/evidence/${s.evidenceSlug}`,
          };
        }),
      },
    ],
  };
}

interface Props {
  project: ProjectAssessment;
  /** SVG viewBox width; height is computed from leaf count */
  width?: number;
  /** Pixels of vertical space per leaf */
  leafSpacing?: number;
}

export function ProjectLineageTree({ project, width = 1100, leafSpacing = 28 }: Props) {
  const data = buildTree(project);
  const root = hierarchy<TreeNode>(data);
  const leafCount = root.leaves().length;

  // Compute height so siblings don't collide
  const height = Math.max(280, leafCount * leafSpacing + 80);

  const layout = tree<TreeNode>().size([height - 40, width - 380]);
  const positioned = layout(root);

  const nodes = positioned.descendants();
  const links = positioned.links();

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ minWidth: 600 }}
        preserveAspectRatio="xMinYMid meet"
        aria-label={`Lineage tree for ${project.name}`}
      >
        <g transform={`translate(40, 20)`}>
          {links.map((link, i) => (
            <LinkPath key={i} source={link.source} target={link.target} />
          ))}
          {nodes.map((node) => (
            <Node key={node.data.id} node={node} />
          ))}
        </g>
      </svg>
    </div>
  );
}

/**
 * Horizontal cubic-bezier link between parent and child.
 * d3 tree positions nodes in (x, y) where x is the cross-axis (sibling spacing)
 * and y is the depth axis. We render horizontally so y maps to screen X,
 * and x maps to screen Y.
 */
function LinkPath({
  source,
  target,
}: {
  source: HierarchyPointNode<TreeNode>;
  target: HierarchyPointNode<TreeNode>;
}) {
  const sx = source.y;
  const sy = source.x;
  const tx = target.y;
  const ty = target.x;
  const mx = (sx + tx) / 2;
  const d = `M ${sx},${sy} C ${mx},${sy} ${mx},${ty} ${tx},${ty}`;
  return <path d={d} stroke="currentColor" strokeOpacity={0.18} fill="none" strokeWidth={1} />;
}

function Node({ node }: { node: HierarchyPointNode<TreeNode> }) {
  const data = node.data;
  const cx = node.y;
  const cy = node.x;
  const labelX = data.kind === "root" || data.kind === "group" ? cx - 12 : cx + 12;
  const anchor = data.kind === "root" || data.kind === "group" ? "end" : "start";

  const dotProps =
    data.kind === "root"
      ? { r: 5, fill: "var(--brand)", stroke: "var(--brand)" }
      : data.kind === "group"
        ? { r: 3.5, fill: "transparent", stroke: "currentColor", strokeOpacity: 0.45 }
        : data.kind === "source"
          ? { r: 3, fill: "var(--brand)", fillOpacity: 0.85, stroke: "var(--brand)" }
          : data.emphasis === "contesting"
            ? { r: 3, fill: "#fb923c", stroke: "#fb923c" }
            : data.emphasis === "consenting"
              ? { r: 3, fill: "#34d399", stroke: "#34d399" }
              : { r: 3, fill: "currentColor", fillOpacity: 0.4, stroke: "currentColor" };

  const isLeafLink = data.kind === "source" && data.href;

  const labelFontSize = data.kind === "root" ? 13 : data.kind === "group" ? 11 : 11;
  const labelWeight = data.kind === "root" ? 600 : data.kind === "group" ? 500 : 400;

  const content = (
    <>
      <text
        x={labelX}
        y={cy}
        dy="0.35em"
        textAnchor={anchor}
        fontSize={labelFontSize}
        fontWeight={labelWeight}
        fill="currentColor"
        fillOpacity={data.kind === "group" ? 0.6 : 0.9}
      >
        {truncate(data.label, data.kind === "source" ? 70 : 50)}
      </text>
      {data.sub && (
        <text
          x={labelX}
          y={cy + 12}
          dy="0.35em"
          textAnchor={anchor}
          fontSize={9}
          fill="currentColor"
          fillOpacity={0.45}
          fontFamily="var(--font-mono)"
          style={{ letterSpacing: "0.05em" }}
        >
          {truncate(data.sub, 60).toUpperCase()}
        </text>
      )}
    </>
  );

  return (
    <g>
      <circle cx={cx} cy={cy} {...dotProps} />
      {isLeafLink ? (
        <a href={data.href} target="_self">
          {content}
        </a>
      ) : (
        content
      )}
    </g>
  );
}

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
