---
id: cb-t8jr
status: open
deps: [cb-ud97]
links: []
created: 2026-10-03T04:01:11Z
type: task
priority: 1
assignee: Byron Wall
parent: cb-pix7
tags: [multi-user-accounts]
---
# Package and rehearse the account migration release

## Outcome

An operator can run the release's migration tool against an isolated copied volume and recover it using documented steps. The built runtime contains the required command and preserves accounts, sessions, books, and images across restart.

## Likely Steps

- Package the migration command, runner, and shared helpers in the existing Docker build. Prefer one image; verify actual contents rather than assuming source scripts exist in the runtime.
- Document APP_DATA_DIR, LEGACY_USER_EMAIL as migration-only input, APP_ORIGIN, BASE_PATH, and hidden initial-password entry. Keep secrets server-only; opaque sessions need no signing-secret setting.
- Rehearse inventory, checked backup, migration, verification, authenticated startup, and restart against a stopped copy. Keep backups outside the data tree and preserve inherited/unknown files.
- Confirm service permissions, space, canonical origin/base-path handling, and the planned scrypt memory/latency in the runtime image.
- Document fresh installation, no-reset behavior, stopped-service volume access, and the boundary between restoring a pre-write backup and repairing forward after new work exists.

Prove the packaged command works without a developer checkout, content comparisons pass, reruns do not reassign the legacy account, and the prepared runtime survives restart. Confirm HTTPS/cookie/proxy behavior in an isolated target when available. Unavailable live facts remain explicit cutover gates.

No live migration, traffic change, deployment, or credential reset is authorized by this preparation ticket. Do not introduce multiple writers, a database, dual storage versions, or automatic cleanup.

## Ready Gate

Migration and the private server boundary must be accepted in cb-xp5r and cb-ud97. Full browser acceptance remains in cb-3g5e. Before ready, identify an isolated volume, stopped-copy provenance, runtime image, and required test permissions. Use pnpm type, lint, and build checks. Local rehearsal can proceed without a production target; it cannot stand in for live environment verification.

## Provenance

[Implementation plan](../docs/intent/multi-user-accounts/implementation-plan.md) — milestone 5 packaging, rehearsal, configuration, and recovery preparation. [Selected shape](../docs/intent/multi-user-accounts/shape-brief.md): disk-backed accounts with ownership added in place. [Intent](../docs/intent/multi-user-accounts/intent-brief.md) claims: preserve, legacy-email, bootstrap, disk, single-process, inherited-scope, no-email, isolation. Repository baseline: `54282e8ef9348b33544d6ff0a9ffeb286b0d8cab`.

