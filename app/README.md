# ComicBam

## See every screen quickly

```sh
pnpm dev:demo
```

Opens http://localhost:3100 already signed in as `dev` with sample comic books (a photo page, a blank book, different page sizes). Sign out to test the public pages; sign in again as `dev` / `devdev`. A second account, `friend` / `devdev`, owns one private book. Run `pnpm dev:seed --reset` to start the demo data over. It lives in `app/tmp/dev-data` and never touches real data.

SolidStart app with Park UI wrappers, Panda CSS, a printable comic creator UI, and JSON-backed server persistence.

## Prerequisites

- Node `>=22.6`
- pnpm `11.9.0`

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
- Private comic API: `src/routes/api/comic-books/`
- Accounts and sessions: `src/lib/auth/`
- Startup storage gate: `scripts/accounts/start.ts`; signup migration: `src/lib/auth/register.server.ts`; optional maintenance CLI: `scripts/accounts/cli.ts`

Before starting, follow [account setup and migration](../docs/account-migration.md). The first signup matching `LEGACY_USERNAME` migrates existing data after a verified backup. New empty data requires explicit initialization.

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
