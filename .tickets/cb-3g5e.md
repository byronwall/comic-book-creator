---
id: cb-3g5e
status: open
deps: [cb-xp5r]
links: []
created: 2026-10-03T04:01:11Z
type: feature
priority: 1
assignee: Byron Wall
parent: cb-pix7
tags: [multi-user-accounts]
---
# Let the legacy account use a private comic library

## Outcome

The migrated legacy account can sign in, open and save existing books, retrieve both edited images and crop originals, sign out, and return after restart. Private data stays behind server checks while registration remains closed.

## Likely Steps

- Add password authentication and disk-backed sessions using asynchronous built-in scrypt, salted self-describing hashes, opaque random cookies, and hashed token records. Reuse the migration's account contract. Bound authentication work and measure crypto memory/latency in the Node runtime.
- Use HttpOnly cookies, production Secure handling, expiry/revocation, and configured app-base paths. Keep credentials/tokens out of client data and logs. Check exact write Origin against APP_ORIGIN and validate local return destinations.
- Require a server-resolved user in every comic list/read/create/save/delete/upload/image operation. Images inherit book ownership. Client owner values are never authority; LEGACY_USER_EMAIL is not a runtime fallback.
- Preserve trusted owner/revision metadata. Serialize atomic book mutations and reject stale revisions or missing-book updates. Remove read-time sample seeding.
- Use direct, authenticated server reads for retained comic and inherited queries so SSR retains the request session. Prevent private serialized HTML and separate account query caches.
- Restrict inherited project/spatial actions, APIs, exports, job snapshots, and streams to the legacy account. Guard before side-effecting reads; check run/project relations and stream expiry. Inspect websocket registration and singleton comic callers before guarding or removing obsolete exposure.
- Use private, uncached media URLs without moving image files. Remove or guard older public paths.

Prove legacy login/edit/image/restart behavior and anonymous denial on every transport. Distinguish absent sessions, missing/foreign books, stale saves, invalid origins, incomplete migration, and corrupt stores. Do not replace errors with empty data or initialization.

Preserve inherited data and the editor. Exclude signup in this intermediate outcome, email/reset services, roles, database conversion, and multi-user inherited tools.

## Ready Gate

The ownership-migration proof must be closed. Confirm the current route/action inventory, migrated disposable store, crypto budget, and permitted local proof. Use pnpm checks; tests/browser use require explicit authorization. Runtime cost may use a documented lower-memory scrypt option, never a fast hash. Never attach old code to migrated data.

## Provenance

[Implementation plan](../docs/intent/multi-user-accounts/implementation-plan.md) — milestone 2 and runtime/password/disk strategies. [Selected shape](../docs/intent/multi-user-accounts/shape-brief.md): disk-backed accounts with ownership added in place. [Intent](../docs/intent/multi-user-accounts/intent-brief.md) claims: accounts, ownership, disk, legacy-email, bootstrap, in-place, inherited-scope, single-process, seeding, isolation. Repository baseline: `54282e8ef9348b33544d6ff0a9ffeb286b0d8cab`.
