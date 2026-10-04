---
id: cb-jqfr
status: in_progress
deps: [cb-ud97]
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

Private account/session and book-revision behavior must be accepted in cb-ud97. Full browser acceptance remains in cb-3g5e. Before ready, confirm the current autosave lifecycle, navigation controls, and isolated two-account proof environment. Resolve test/browser authorization; use pnpm checks. Signup and this work can progress separately once the private-library foundation is proven.

## Provenance

[Implementation plan](../docs/intent/multi-user-accounts/implementation-plan.md) — milestone 3 draft and account-switch scope; disk-save strategy. [Selected shape](../docs/intent/multi-user-accounts/shape-brief.md): disk-backed accounts with ownership added in place. [Intent](../docs/intent/multi-user-accounts/intent-brief.md) claims: preserve, accounts, ownership, in-place, single-process, isolation. Repository baseline: `54282e8ef9348b33544d6ff0a9ffeb286b0d8cab`.


## Execution packet

Owner: draft worker; root owns Git and ticket state. Base: 7a4d9c9 with registration in progress on a separate file boundary. Accepted server prerequisite: cb-ud97. Browser proof remains required and currently waits for browser access.

Allowed scope: ComicCreatorApp, ComicAppNav, image upload hook, private book routes/library account boundary, and new draft helpers/components/tests. Do not change registration, storage, middleware, or password/session services without a contract request.

Use one save request at a time and retain the newest pending draft. Track confirmed revision separately. Pause on 401/409 or network failure; keep the draft and expose JSON download, checked resume, and explicit reload/discard. Never apply a late response over newer content. A same-account resume must first read the current stored revision.

Capture userId at mount; include it on every mutation. Recheck /api/auth/session on focus/pageshow before allowing work in restored pages. Keep old account content hidden on account change and preserve editor recovery. Flush before intentional navigation/sign-out, or let the user cancel or discard. Retain beforeunload protection. Keep account controls out of print.

Proof: focused queue tests with delayed replies, failed requests, and conflicting revisions. Check old-tab account changes at the server boundary. Type-check and lint changed files. User authorized disposable browser checks; do not use live data or browser tools while the parent verifier owns them. Keep required browser proof open if the host remains unavailable.

## Notes

**2026-10-03T05:47:12Z**

Draft implementation and code review are complete. The editor uses a single-flight latest-snapshot queue, checked revision recovery, captured account context, cancelable uploads, and visible Save/Discard/Stay controls during pending navigation. Queue generations prevent late acknowledgments after reset/dispose. The route mounts by book ID. Three focused queue tests, type checks, targeted lint, and diff checks passed. The large editor was split into focused modules. Browser acceptance is still underway on the cleanly restarted disposable server.
