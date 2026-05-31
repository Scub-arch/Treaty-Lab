# Retrieval eval — `ask-eval.jsonl`

Hand-graded Q&A pairs for the AI-004 evidence retrieval (`src/lib/llm/retrieval.ts`).
Each line: a question a user might ask `/api/ask` without picking a project/domain,
plus the evidence slugs a human judges relevant.

```jsonc
{ "question": "...", "expected_evidence": ["slug", ...], "notes": "..." }
```

## Metric

**Recall@5** — fraction of pairs where `retrieveEvidence(question, 5)` returns at
least one `expected_evidence` slug in its top 5.

## Baseline (2026-05-31, MiniSearch BM25 v1)

**10 / 10 = 1.00 recall@5.** Every pair's top expected slug appeared in the top 3
of the live index (48 evidence items), measured with the exact config in
`retrieval.ts` (`boost: { title: 3, supports: 1.5, plainSummary: 1, tags: 1 }`,
`prefix`, `fuzzy: 0.2`, `combineWith: "OR"`).

This is a high baseline because the queries are well-formed and the corpus is
small and topically distinct. It is a regression guard: a config or content
change that drops recall below 1.00 should be investigated. The harder signal —
answer quality with retrieved context — is not graded here (needs the gateway).

## Re-running

`retrieveEvidence` reads the live (Prisma-backed) evidence via the content
getters, so a faithful runner must boot the app context. The quickest manual
check is the same MiniSearch config over `src/content/evidence.json`; an
automated runner that imports `retrieval.ts` directly is a worthwhile follow-up
(needs the `@/` alias resolved under the runner).

## v2 (separate ticket)

pgvector over embedded `plainSummary` + `supports[]`, to catch semantic matches
the lexical index misses (paraphrases, synonyms).
