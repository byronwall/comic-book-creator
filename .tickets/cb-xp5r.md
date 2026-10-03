---
id: cb-xp5r
status: open
deps: []
links: []
created: 2026-10-03T04:01:11Z
type: task
priority: 1
assignee: Byron Wall
parent: cb-pix7
tags: [multi-user-accounts]
---
# Prove legacy ownership migration without content loss

## Outcome

A disposable legacy library gains one prepared account without changing its creative content or image bytes. An operator can inspect a preservation report, repeat the migration, and recover a checked interruption.

## Likely Steps

- Add offline inventory, migration, verification, and explicit empty-store initialization to the disk-based system.
- Require an explicit absolute data target and LEGACY_USER_EMAIL for existing data. Set the initial password with a hidden local prompt. Never use a default password or public email-matching claim.
- Back up the entire stopped source outside its data tree. Preserve unknown files, unreferenced images, auxiliary project/spatial data, and crop originals.
- Add only ownerUserId and the initial save revision to raw book records. Preserve IDs, disk paths, timestamps, nested values, and unknown fields. Bypass the current read-time seeding and normalizers.
- Stage complete replacements, record source/target hashes and the stable account assignment, and commit the completion marker only after comparison. Protect credentials and backup access.
- Make matching reruns no-ops. Stop on changed email, conflicting ownership, malformed data, invalid IDs/paths, duplicate IDs, missing images, or unexplained hashes. Resume only recorded source/target states; do not silently skip files.

Prove complete file accounting, nested-value equality, unchanged image/auxiliary bytes, rerun safety, and interrupted recovery on controlled fixtures. The observed local inventory is not a required production count. A fresh store is explicitly empty; web requests never initialize or seed it.

Do not move image files, clean up orphans/backups, add a database, build a general migration framework, or touch production.

## Ready Gate

First dependency-free proof. Before marking ready, confirm the current disk shape, existing crypto helpers, and a stopped copy or owned fixtures. Settle runnable proof and test authorization. Use real local filesystem semantics. A migration lock cannot stop an old app writer. Keep production unchanged and use pnpm for project checks and any runner dependency.

## Provenance

[Implementation plan](../docs/intent/multi-user-accounts/implementation-plan.md) — milestone 1 and storage/password strategy. [Selected shape](../docs/intent/multi-user-accounts/shape-brief.md): disk-backed accounts with ownership added in place. [Intent](../docs/intent/multi-user-accounts/intent-brief.md) claims: preserve, legacy-email, disk, bootstrap, in-place, single-process, seeding, raw-migration, isolation. Repository baseline: `54282e8ef9348b33544d6ff0a9ffeb286b0d8cab`.

