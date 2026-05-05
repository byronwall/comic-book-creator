# Srcly Code Quality Skill

Use this skill when asked to review, prioritize, or improve a codebase using Srcly artifacts.

## Workflow

1. Run `uvx srcly report . --out .srcly --format both` from the repository root.
2. Read `.srcly/report.md`.
3. Load `.srcly/findings.json` and sort by `priority`, then `score`.
4. For each selected finding, inspect the source file and nearby tests before proposing or making edits.
5. Use `.srcly/tree.summary.json` to understand whether a target is an isolated hotspot or part of a broader subsystem.
6. Use `uvx srcly scan . --out .srcly/tree.json` or `uvx srcly report . --include-tree` only when the compact summary is insufficient.
7. Add `--verbose` to `uvx srcly report` only when per-file scan progress is useful; reports are quiet by default.

## Interpretation Rules

- High complexity means "inspect control flow"; it does not automatically mean "refactor".
- High LOC means "look for separable responsibilities"; it does not automatically mean "split file".
- TSX render branching, inline handlers, and prop count suggest UI complexity and test-surface risk.
- `any` and TS ignores suggest type-safety debt.
- Import coupling suggests dependency-boundary review.
- Low comments are only concerning when paired with complexity, public API behavior, or non-obvious domain logic.

## Output Style

When reporting back, include:

- The top 3-5 targets.
- Why each target matters, with metric evidence.
- Recommended next action.
- Tests or verification needed before changes.
