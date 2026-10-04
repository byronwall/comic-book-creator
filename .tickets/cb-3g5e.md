---
id: cb-3g5e
status: in_progress
deps: [cb-xp5r, cb-ud97]
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

## Execution packet

Owner: root. Migration primitives belong to the migration worker until acceptance.
Start after cb-xp5r closes. Use the same checkout and the next stack branch.

### Code boundary

- Session and request helpers in `app/src/lib/auth/`.
- Comic persistence, queries, API routes, sign-in, and private route navigation.
- Middleware for inherited API access and private response headers.
- Explicit guards in inherited server queries and actions; session-bound event streams.
- Remove the unused singleton comic endpoint and unregistered websocket file.

### Contracts

Resolve account identity from the opaque session cookie. Return only id/email to clients.
Use the migrated registry and data-state marker. Missing or corrupt prepared stores fail closed.
Check exact APP_ORIGIN on writes. Require expected account context on comic writes.
The context value only rejects stale tabs. It cannot select the owner.
Comic persistence accepts a trusted account ID. Foreign and missing records return 404.
Atomic serialized saves compare the submitted revision and increment it once.
Keep images in place; render a new private URL namespace with no-store headers.
Require legacyUserId for inherited endpoints before reads that can write to disk.

### Acceptance and proof

Use only temporary migrated fixtures. The user approved focused tests and browser checks.
Check cookie expiry, disk persistence, logout revocation, Origin failures, and safe redirects.
Check legacy books and crop originals through authenticated HTTP and SSR.
Check anonymous denial on APIs, server queries/actions, images, and inherited tools.
Check stale saves and forged IDs without changing stored content or owner.
Run focused tests, type-check, lint for changed files, and the production build.
Record known baseline lint failures separately. Browser screenshots stay in `tmp/`.

### Exclusions

Do not enable signup until this boundary passes. Do not migrate live data or deploy.
Do not add roles, email delivery, database storage, or multi-process locks.

## Notes

**2026-10-03T04:34:41Z**

Owner: root handles sessions, request guards, inherited transports, queries, sign-in, and navigation. A bounded comic-storage worker handles comic persistence and comic API routes. Prerequisite cb-xp5r is accepted at 57f94cb.

Shared contracts: requireUser(request) resolves {id,email}; requireMutationUser(request, expectedUserId?) also checks Origin and X-Comic-User context. apiResponse wraps Response errors; fail(status,message) throws a Response. Comic storage takes trusted userId as its first argument. appPath prefixes the configured base path. Parent owns these shared auth/router helpers, Git, tickets, and all UI files.

**2026-10-03T04:59:02Z**

Integration checkpoint: 46 HTTP checks passed on the development server and again after restart with the production build. Coverage includes anonymous denial, A/B book and image isolation, crop originals, inherited project/spatial access, stale revisions, forged owners, missing context, invalid Origin, deleted-book saves, and safe private SSR output.

Native sign-in/sign-out POSTs passed. The deep-link return worked; logout revoked the token. Production cookies include HttpOnly, Secure, SameSite=Lax, and Path=/. Existing sessions and books survived the process restart. The production build passed. Full lint passed with 34 warnings and no errors; the missing @eslint/js dependency is repaired.

Browser review caught an SSR redirect timing failure. Middleware now redirects before rendering, and the independent browser recheck passed. Remaining browser login/edit proof is pending: the in-app browser disconnected, and Chrome reported an open extension window. A user action question is pending while the parent tries reopening the Codex preview. Do not claim full browser acceptance yet.

**2026-10-03T04:59:35Z**

Execution decision: keep this ticket open for the remaining browser proof. Its server contract has passed integration and production-restart checks. Continue dependent implementation on checkpoint branches while browser access is unavailable. This changes execution order only; it does not remove any acceptance check or authorize deployment. Keep dependent outcomes unfinished until their browser proof passes.
