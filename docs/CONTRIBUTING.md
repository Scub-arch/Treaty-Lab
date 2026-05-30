# Contributing to Treaty-Lab

Working notes for contributors. Pair this with [`README.md`](../README.md) for setup and [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) for the system map.

## The gate

Every PR runs `npm run check` in CI (see [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)). Locally:

```bash
npm run check         # full gate: content + NRTA + tsc --noEmit
npm run lint          # eslint
npm run format        # prettier --write
npm run format:check  # prettier --check (read-only)
```

Run `npm run check` before pushing. CI will rerun it; failing locally first is cheap.

## Branch naming

- `<epic>-NNN-short-slug` — match the epic prefix in [`docs/LINEAR_BACKLOG.md`](LINEAR_BACKLOG.md). Epics: `fnd`, `data`, `ai`, `ui`, `rpt`, `sec`, `dpl`.
- One issue per branch where possible.

Examples: `fnd-003-pr-template-contributing`, `ai-001-llm-dedup`, `data-001-postgres-migration`.

## Commit messages — Conventional Commits

Format: `<type>(<scope>): <description>`

| Type       | When to use                            |
| ---------- | -------------------------------------- |
| `feat`     | New feature or user-visible capability |
| `fix`      | Bug fix                                |
| `chore`    | Repo housekeeping, no behavior change  |
| `docs`     | Documentation only                     |
| `refactor` | Code reshaped, behavior unchanged      |
| `test`     | Tests added or fixed                   |
| `ci`       | CI workflow or pipeline changes        |
| `build`    | Build system, deps, lockfile           |
| `style`    | Formatting only — no semantic change   |
| `perf`     | Performance change                     |
| `revert`   | Reverting an earlier commit            |

Scope is the LINEAR_BACKLOG issue ID in lowercase (`fnd-003`, `ai-001`, `data-002`) or the module name (`treaty`, `water`, `energy`, `finance`, `archive`, `contributing`). Omit the scope if neither applies.

The description is imperative ("add", "delete", "fix"), lowercase, no trailing period.

Examples:

```
feat(ai-001): de-dup token cache in src/lib/llm/
fix(nrta-002): correct Wapiti authorization volume units
chore(fnd-001): delete scaffold and retired commit message files
docs(contributing): document commit style
ci(fnd-002): add CI gate
```

Mention breaking changes in the body with a `BREAKING CHANGE:` footer.

## Pull requests

- Use the template in [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md) — work through the checklist before requesting review.
- One issue per PR where possible. Bundle only when the changes don't make sense alone (e.g. a refactor that's pre-work for a feature in the same PR — call it out in the summary).
- Open as draft if work is still in flight; mark ready for review once `npm run check` passes locally and the checklist is filled in.

## Content edits — extra care

Treaty-Lab content claims (in `src/content/*.json`, `prisma/seed.ts`, NRTA bundles) carry source attribution. When editing content:

- Every new claim needs a `primarySources[]` entry and a matching `evidence.json` record (or an existing one referenced by slug).
- Run `npm run check:content` and `npm run check:nrta` to validate cross-references resolve.
- Flag claims that can't be cited as `needs_validation` rather than removing the source-flag.
- Indigenous oral histories of treaty intent may differ from the Crown / institutional written record. Note the divergence on the treaty page rather than silently picking one.

## Contributors

- [Scub-arch](https://github.com/Scub-arch) — project lead
