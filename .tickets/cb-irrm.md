---
id: cb-irrm
status: open
deps: [cb-f2t6, cb-t8jr]
links: []
created: 2026-10-03T04:01:12Z
type: task
priority: 1
assignee: Byron Wall
parent: cb-pix7
tags: [multi-user-accounts]
---
# Migrate the live library after explicit rollout approval

## Automatic migration update — 2026-10-03

The current release uses automatic startup migration when LEGACY_USER_EMAIL is supplied.
A verified persistent copy precedes all source changes. A private random password replaces the deployment password prompt.
Normal requests never migrate data. Completion checks permit later account and book changes.
The [current migration guide](../docs/account-migration.md) supersedes offline-only startup and manual cutover instructions below.
Backups and recovery records are permanent. No live operation is authorized by this implementation.

## Outcome

After explicit rollout authorization, the real legacy library belongs to its prepared account. The account-aware site serves separate libraries with a verified backup and an honest recovery boundary.

## Likely Steps

- Confirm the actual persistent volume, canonical HTTPS origin, base path, proxy/cache behavior, service permissions, and space. Obtain the real legacy email and hidden password input.
- Stop the old app and drain jobs. Verify the full backup, then run the rehearsed release's dry-run, apply, and comparison.
- Start privately and confirm legacy sign-in, file accounting, images/crop sources, a controlled save, session persistence, and HTTPS/Origin behavior before reopening traffic.
- Check any configured shared image cache and purge it if needed. Older downloaded or public cached copies cannot be recalled by new response headers.
- Record actual results and retain backups/journals until rollout is accepted.

Require preservation evidence for every source file, not a hard-coded book count. A local inventory is not production proof. Keep malformed or incomplete data closed to traffic; never reseed or silently reassign it.

Before new writes, restore the complete backup with the old release if needed. Never run old code against migrated files. After registrations or edits exist, preserve current data and repair forward or reconcile later changes before any restore. Do not claim automatic lossless downgrade.

## Ready Gate

Visitor/account/draft work and the packaged rehearsal must be closed. Keep open until the user explicitly authorizes live migration/deployment and the real target, credentials, backup, and proof access are verified. Unknown environment facts stop at local proof. Ticket creation is not deployment approval.

Exclude new product features, cleanup, account recovery flows, and multi-user inherited tools. Preserve all existing auxiliary data.

## Provenance

[Implementation plan](../docs/intent/multi-user-accounts/implementation-plan.md) — milestone 5 authorized cutover and rollback. [Selected shape](../docs/intent/multi-user-accounts/shape-brief.md): disk-backed accounts with ownership added in place. [Intent](../docs/intent/multi-user-accounts/intent-brief.md) claims: preserve, legacy-email, accounts, landing, ownership, bootstrap, single-process, inherited-scope, planning-only. Repository baseline: `54282e8ef9348b33544d6ff0a9ffeb286b0d8cab`.

