---
id: cb-jqfr
status: open
deps: [cb-3g5e]
links: []
created: 2026-10-03T04:01:11Z
type: feature
priority: 1
assignee: Byron Wall
parent: cb-pix7
tags: [multi-user-accounts]
---
# Protect drafts during expiry and account changes

## Outcome

An expired session, changed account, or stale save cannot silently replace an unsaved comic draft. An old tab cannot create, upload, save, or delete as the newly selected account.

## Likely Steps

- Add a captured account context to editor mutations and verify it against the server session. This value is a mismatch check, never ownership authority.
- Keep one save in flight and the newest pending snapshot. Track the confirmed revision separately from local edits; acknowledgments must not replace newer content.
- Pause saves on expiry, account mismatch, or revision conflict. Retain the draft and offer reload or recovery JSON download. Resume after same-account login only after checking the current revision.
- Recheck identity on restored pages and tab focus. Clear affected caches and hide stale account views before loading another account.
- Before intentional logout/navigation, finish pending saves or offer explicit cancel/discard. Keep dirty-close warnings and avoid forced navigation on expiry.

Prove concurrent stale-revision rejection, delayed save acknowledgments, save failure, and two-tab A-to-B switching. A successful save followed by stale UI must not trigger a blind overwrite. Repeat signup is unnecessary for this proof: use disposable pre-created A/B accounts. Confirm that crop/upload operations also enforce account context.

Preserve existing text/image editing and printing. Do not add automatic merges, offline persistence, revision history, device synchronization, or a promise of recovery after browser termination.

## Ready Gate

Private account/session and book-revision behavior must be closed. Before ready, confirm the current autosave lifecycle, navigation controls, and isolated two-account proof environment. Resolve test/browser authorization; use pnpm checks. Signup and this work can progress separately once the private-library foundation is proven.

## Provenance

[Implementation plan](../docs/intent/multi-user-accounts/implementation-plan.md) — milestone 3 draft and account-switch scope; disk-save strategy. [Selected shape](../docs/intent/multi-user-accounts/shape-brief.md): disk-backed accounts with ownership added in place. [Intent](../docs/intent/multi-user-accounts/intent-brief.md) claims: preserve, accounts, ownership, in-place, single-process, isolation. Repository baseline: `54282e8ef9348b33544d6ff0a9ffeb286b0d8cab`.

