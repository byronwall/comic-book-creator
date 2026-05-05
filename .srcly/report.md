# Srcly Code Quality Report

## Summary

- Root: `/Users/byronwall/Projects/comic-books`
- Profile: `general`
- Ranked hotspots: 50
- Findings: 50 total, 0 high, 12 medium.
- Focus paths: `none`
- Deprioritized paths: `.agents/, docs/idea/, vendor/, vendors/, node_modules/`

Read first: `report.md`, then `findings.top.json`, then `action-plan.md`. Load full JSON artifacts only when you need detail beyond the top findings.

## Top Targets

| Rank | Priority | Path priority | Path | Why | Suggested next action |
| --- | --- | --- | --- | --- | --- |
| srcly-001 | medium | neutral | `/Users/byronwall/Projects/comic-books/app/src/lib/projects/context-node-markdown.ts::parseMarkdownHeadingSections:41-147` | Complexity hotspot in parseMarkdownHeadingSections (complexity=24, loc=107, max_nesting_depth=5, parameter_count=2) | Trace the control flow and identify behavior-preserving simplification points. |
| srcly-002 | medium | neutral | `/Users/byronwall/Projects/comic-books/app/src/components/comics/comic-creator.css` | Large node worth responsibility review in comic-creator.css (loc=1259) | Look for separable responsibilities and tests that protect behavior. |
| srcly-003 | medium | neutral | `/Users/byronwall/Projects/comic-books/app/src/components/comps-explorer/DesignSystemOverview.tsx::DesignSystemOverview::<VStack>:1125-2245` | Large node worth responsibility review in <VStack> (loc=1121) | Look for separable responsibilities and tests that protect behavior. |
| srcly-004 | medium | neutral | `/Users/byronwall/Projects/comic-books/app/src/lib/comics/data.server.ts::getPanelRects:287-468` | Complexity hotspot in getPanelRects (complexity=24, loc=182, max_nesting_depth=3, parameter_count=1) | Trace the control flow and identify behavior-preserving simplification points. |
| srcly-005 | medium | neutral | `/Users/byronwall/Projects/comic-books/app/src/components/comics/comic-layouts.ts::getPanelRects:37-217` | Complexity hotspot in getPanelRects (complexity=24, loc=181, max_nesting_depth=3, parameter_count=1) | Trace the control flow and identify behavior-preserving simplification points. |
| srcly-006 | medium | neutral | `/Users/byronwall/Projects/comic-books/app/src/lib/spatial-map/layout.ts::stepLayout:346-447` | Complexity hotspot in stepLayout (complexity=23, loc=102, max_nesting_depth=3, parameter_count=3) | Trace the control flow and identify behavior-preserving simplification points. |
| srcly-007 | medium | neutral | `/Users/byronwall/Projects/comic-books/app/src/components/comps-explorer/DesignSystemOverview.tsx::DesignSystemOverview:568-2247` | Large node worth responsibility review in DesignSystemOverview (complexity=9, loc=1680, max_nesting_depth=3, parameter_count=1) | Look for separable responsibilities and tests that protect behavior. |
| srcly-008 | medium | neutral | `/Users/byronwall/Projects/comic-books/app/src/components/comps-explorer/DesignSystemOverview.tsx` | TSX surface with concentrated rendering complexity in DesignSystemOverview.tsx (complexity=2.1538, loc=2134, max_nesting_depth=3, parameter_count=36, ts_import_coupling_count=9, tsx_render_branching_count=14) | Look first for render-only child components, modal/dialog subtrees, action hooks, and derived selectors to extract; verify with type-check and targeted UI coverage. |
| srcly-009 | medium | neutral | `/Users/byronwall/Projects/comic-books/app/src/lib/comics/data.server.ts::normalizePage:161-230` | Complexity hotspot in normalizePage (complexity=22, loc=70, parameter_count=2) | Trace the control flow and identify behavior-preserving simplification points. |
| srcly-010 | medium | neutral | `/Users/byronwall/Projects/comic-books/app/src/lib/spatial-map/layout.ts` | Import coupling hotspot in layout.ts (complexity=3.9286, loc=974, max_nesting_depth=4, parameter_count=107, ts_import_coupling_count=2) | Inspect dependency boundaries and look for imports that can be inverted, localized, or simplified. |

## Tree Summary

```text
.  loc=34760 complexity=8.75 files=297 hotspot=0.0
  README.md  loc=165 complexity=0.0 files=1 hotspot=0.0773
    README.md::# Comic Book Creator  loc=208 complexity=0 files=0 hotspot=0.0975
      README.md::# Comic Book Creator::## Data Model  loc=65 complexity=0 files=0 hotspot=0.0305
      README.md::# Comic Book Creator::## Repository Layout  loc=34 complexity=0 files=0 hotspot=0.0159
      README.md::# Comic Book Creator::## Environment  loc=20 complexity=0 files=0 hotspot=0.0094
      README.md::# Comic Book Creator::## What You Can Do  loc=19 complexity=0 files=0 hotspot=0.0089
      README.md::# Comic Book Creator::## Getting Started  loc=19 complexity=0 files=0 hotspot=0.0089
      README.md::# Comic Book Creator::## Scripts  loc=16 complexity=0 files=0 hotspot=0.0075
  AGENTS.md  loc=78 complexity=0.0 files=1 hotspot=0.0366
    AGENTS.md::# AGENTS.md - Working in `app/`  loc=96 complexity=0 files=0 hotspot=0.045
      AGENTS.md::# AGENTS.md - Working in `app/`::## Quick Rules  loc=22 complexity=0 files=0 hotspot=0.0103
      AGENTS.md::# AGENTS.md - Working in `app/`::## Commands  loc=15 complexity=0 files=0 hotspot=0.007
      AGENTS.md::# AGENTS.md - Working in `app/`::## Router Actions + Forms  loc=14 complexity=0 files=0 hotspot=0.0066
      AGENTS.md::# AGENTS.md - Working in `app/`::## UI Conventions  loc=13 complexity=0 files=0 hotspot=0.0061
      AGENTS.md::# AGENTS.md - Working in `app/`::## Available Feature Modules  loc=13 complexity=0 files=0 hotspot=0.0061
      AGENTS.md::# AGENTS.md - Working in `app/`::## Key Paths  loc=9 complexity=0 files=0 hotspot=0.0042
  app  loc=33483 complexity=8.75 files=292 hotspot=0.0
    app/panda.config.ts  loc=141 complexity=0.5 files=1 hotspot=0.1004
      app/panda.config.ts::object  loc=141 complexity=1 files=0 hotspot=0.052
      app/panda.config.ts::(imports)  loc=19 complexity=0 files=0 hotspot=0.0089
    app/eslint.config.mjs  loc=80 complexity=0 files=1 hotspot=0.0375
    app/app.config.ts  loc=20 complexity=0.5 files=1 hotspot=0.0233
      app/app.config.ts::object  loc=12 complexity=1 files=0 hotspot=0.0264
      app/app.config.ts::(imports)  loc=3 complexity=0 files=0 hotspot=0.0014
    app/vitest.config.ts  loc=15 complexity=0.5 files=1 hotspot=0.0225
      app/vitest.config.ts::object  loc=10 complexity=1 files=0 hotspot=0.026
      app/vitest.config.ts::(imports)  loc=3 complexity=0 files=0 hotspot=0.0014
    app/README.md  loc=35 complexity=0.0 files=1 hotspot=0.0164
      app/README.md::# Comic Book Creator  loc=52 complexity=0 files=0 hotspot=0.0244
    app/Dockerfile  loc=32 complexity=0 files=1 hotspot=0.015
  docs  loc=1026 complexity=0 files=2 hotspot=0.0
    docs/idea  loc=1026 complexity=0 files=2 hotspot=0.0
      docs/idea/comic_book_creator_index.html  loc=928 complexity=0 files=1 hotspot=0.2392
      docs/idea/chat.md  loc=98 complexity=0.0 files=1 hotspot=0.0253
  .codex  loc=8 complexity=0 files=1 hotspot=0.0
    .codex/environments  loc=8 complexity=0 files=1 hotspot=0.0
      .codex/environments/environment.toml  loc=8 complexity=0 files=1 hotspot=0.0037
```

## Agent Notes

- Treat findings as triage signals, not confirmed bugs.
- Inspect the referenced source and tests before editing.
- Prefer small, behavior-preserving changes unless the requested task calls for a larger refactor.
