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

## User name signup update — 2026-10-03

User names now replace the previous account identifier throughout the app, stored accounts, sessions, forms, and configuration.
LEGACY_USERNAME selects the first signup that claims legacy data. That signup uses its chosen password.
Startup validates pending storage but does not migrate it. A complete verified persistent copy still precedes source changes.
Byron explicitly selected first matching signup ownership, with no additional claim code. Other signup waits until completion.
This update and the current migration guide supersede previous startup-password and offline-only setup instructions below.


## Automatic migration update — 2026-10-03

The current release uses matching signup migration when LEGACY_USERNAME is supplied.
A verified persistent copy precedes all source changes. Matching signup supplies the account password.
Normal requests never migrate data. Completion checks permit later account and book changes.
The [current migration guide](../docs/account-migration.md) supersedes offline-only startup and manual cutover instructions below.
Backups and recovery records are permanent. No live operation is authorized by this implementation.

## Outcome

After explicit rollout authorization, the real legacy library belongs to its prepared account. The account-aware site serves separate libraries with a verified backup and an honest recovery boundary.

## Likely Steps

- Confirm the actual persistent volume, canonical HTTPS origin, base path, proxy/cache behavior, service permissions, and space. Obtain the real legacy username and hidden password input.
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

[Implementation plan](../docs/intent/multi-user-accounts/implementation-plan.md) — milestone 5 authorized cutover and rollback. [Selected shape](../docs/intent/multi-user-accounts/shape-brief.md): disk-backed accounts with ownership added in place. [Intent](../docs/intent/multi-user-accounts/intent-brief.md) claims: preserve, legacy-username, accounts, landing, ownership, bootstrap, single-process, inherited-scope, planning-only. Repository baseline: `54282e8ef9348b33544d6ff0a9ffeb286b0d8cab`.


## Startup release constraints — 2026-10-03

Set the intended legacy username before the normal Compose deployment. Preserve the existing project name, named data volume, and persistent backup volume.
Stop the old container before startup. The old release does not honor the new writer lock. Keep enough disk space for the full copy.
Read the private generated password from the reported backup path after startup. No manual migration command or terminal prompt is required.
No live migration, deployment, or main merge was performed during implementation.

## Current signup release rule — 2026-10-03

Set LEGACY_USERNAME and deploy normally with the existing named data and backup volumes.
Then create that account through the site with the password you want to use.
Byron approved first matching signup ownership. No claim code or temporary password is required.
No live operation was performed.
