# Comic Book Creator

SolidStart app with Park UI wrappers, Panda CSS, a printable comic creator UI, and JSON-backed server persistence.

## Prerequisites

- Node `>=22`
- pnpm

## Commands

```bash
pnpm install
pnpm prepare
pnpm dev
pnpm lint
pnpm lint:fix
pnpm type-check
pnpm test
pnpm build
pnpm start
```

## Architecture

- UI wrappers: `src/components/ui/*`
- Theme + recipes: `src/theme/*`
- Panda output (generated): `styled-system/*`
- Comic persistence: `src/lib/comics/*` and `data/comic-books/*.json`
- Comic API: `src/routes/api/comic-book.ts`

## Reconciled Additions

This starter now includes additional reusable wrappers and dev scaffolding sourced from `visual-notes`:

- New wrappers: `WrapWhen`, `ClearButton`, `ConfirmDialog`, `PanelPopover`, `SimpleDialog`, `SimplePopover`, `SimpleSelect`
- UI wrapper quality fixes in `button`, `file-upload`, `select`, `tooltip`
- Added `vitest.config.ts` and scripts for `test` + `type-check`
- Added `amber` semantic color family and background semantic tokens in Panda config

For complete migration details and rationale, see `../docs/visual-notes-reconciliation-2026-02-15.md`.

## Markdown Renderer Module

Reusable markdown rendering (GFM, syntax-highlighted code blocks, mermaid rendering) is available at:

- `src/components/markdown-renderer/`

Usage guide:

- `../docs/markdown-renderer-usage.md`
