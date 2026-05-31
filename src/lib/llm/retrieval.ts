/**
 * Evidence retrieval (AI-004) — BM25 full-text over the evidence library.
 *
 * v1: lexical only (MiniSearch, no embeddings, no external vector store). When a
 * user asks /api/ask without picking a project/domain, the route calls
 * `retrieveEvidence(question)` and inlines the top hits so the model can cite
 * real evidence by slug. v2 (separate ticket): pgvector over embedded
 * plainSummary + supports.
 *
 * The index is built once from the content getters (Prisma-backed, in-memory)
 * and cached for the process — evidence is static at runtime.
 */

import MiniSearch from "minisearch";
import { getEvidence } from "@/lib/content";
import type { EvidenceItem } from "@/lib/content/types";

interface IndexDoc {
  slug: string;
  title: string;
  plainSummary: string;
  supports: string;
  tags: string;
}

let index: MiniSearch<IndexDoc> | null = null;
let bySlug: Map<string, EvidenceItem> | null = null;

function ensureIndex(): { index: MiniSearch<IndexDoc>; bySlug: Map<string, EvidenceItem> } {
  if (index && bySlug) return { index, bySlug };

  const evidence = getEvidence();
  const slugMap = new Map(evidence.map((e) => [e.slug, e]));
  const mini = new MiniSearch<IndexDoc>({
    idField: "slug",
    fields: ["title", "plainSummary", "supports", "tags"],
    storeFields: ["slug"],
    searchOptions: {
      // Title hits matter most; tags least. Prefix + light fuzz for typos.
      boost: { title: 3, supports: 1.5, plainSummary: 1, tags: 1 },
      prefix: true,
      fuzzy: 0.2,
      combineWith: "OR",
    },
  });
  mini.addAll(
    evidence.map((e) => ({
      slug: e.slug,
      title: e.title,
      plainSummary: e.plainSummary,
      supports: (e.supports ?? []).join(" "),
      tags: (e.tags ?? []).join(" "),
    })),
  );

  index = mini;
  bySlug = slugMap;
  return { index: mini, bySlug: slugMap };
}

export interface RetrievedEvidence {
  item: EvidenceItem;
  /** MiniSearch relevance score (higher = more relevant). */
  score: number;
}

/** Return the top-K evidence items most relevant to `query` (BM25-ranked). */
export function retrieveEvidence(query: string, k = 5): RetrievedEvidence[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const { index: mini, bySlug: slugMap } = ensureIndex();

  const out: RetrievedEvidence[] = [];
  for (const result of mini.search(trimmed)) {
    const item = slugMap.get(result.id as string);
    if (item) out.push({ item, score: result.score });
    if (out.length >= k) break;
  }
  return out;
}

/**
 * Format retrieved evidence as a context block to prepend to the user message.
 * Each entry leads with its slug so the model can cite `[evidence: <slug>]`.
 */
export function formatRetrievedContext(hits: RetrievedEvidence[]): string {
  if (hits.length === 0) return "";
  const lines = hits.map(({ item }) => {
    const supports = (item.supports ?? []).slice(0, 3).join("; ");
    return [
      `- [evidence: ${item.slug}] ${item.title}`,
      `  ${item.plainSummary}`,
      supports ? `  Supports: ${supports}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  });
  return ["Relevant evidence retrieved from the library (cite these by slug):", ...lines].join(
    "\n",
  );
}

/** Reset the cached index (tests / content reloads). */
export function resetRetrievalIndex(): void {
  index = null;
  bySlug = null;
}
