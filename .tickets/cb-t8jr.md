---
id: cb-t8jr
status: partially_implemented
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


## Execution packet

Owner: root. The migration and server contract are accepted. Browser acceptance remains separate and unfinished. Prepare the runtime on independent Docker/config/documentation paths while the draft worker owns editor code.

The existing image excludes migration source and pnpm. Add the CLI and its exact dependency files to the runtime. Keep the same image for service and maintenance commands. Exclude app/data from the build context. Pass BASE_PATH at build time and require the same value at runtime.

Observed packaging issue: a backup beside /app/data would be outside the mounted data volume and disappear with a one-off container. Add an explicit migration backup directory and a separate persistent backup volume. Preserve default sibling backups for local commands. Validate that the selected backup directory is outside the source tree.

Proof: build the runtime image, inspect its packaged command, migrate a stopped synthetic copy, compare backup files, verify and rerun, start the app, then restart and check sessions/books. Record Docker storage paths and crypto resource measurements. Do not deploy or operate on live data.

## Notes

**2026-10-03T05:36:09Z**

The release review found and repaired backup paths that follow symlinks into data, plus an unintended random host-port default. Migration tests passed after the path fix. Normal Docker builds stalled while fetching registry metadata. An offline Linux rehearsal used the existing local Node 22 dependency image; its app build passed. The packaged CLI completed dry-run, hidden-password apply, verification, and matching rerun on synthetic data with a separate backup mount. One crypto sample used 192792 KiB peak RSS; hash took 1903 ms and verification took 559 ms under concurrent build load. Runtime login/restart proof continues. A clean registry-backed build remains unproved.

**2026-10-03T05:37:25Z**

The packaged Linux runtime passed native login with Secure/HttpOnly cookies, private legacy book and crop-original reads, new-book creation/save, and container restart. The same session remained valid after restart; the saved book retained revision 2. Data target: root tmp/accounts-proof/docker-data, with backups mounted separately. No actual app/data or live deployment was changed.

**2026-10-03T05:40:24Z**

A separate production build with BASE_PATH=/comics passed prefixed landing/signup/icon URLs, anonymous book redirects, native sign-in POST, deep-link return, Secure cookie Path=/comics/, private library links, and private crop-original access. It used a separate disposable data copy on port 3004 and is now stopped.

**2026-10-03T05:45:05Z**

A final boundary review aligned migration preflight with readable runtime records: invalid book IDs, missing titles/timestamps, empty pages, invalid text lists, and unsupported image filenames stop before migration. The command preserves the source for repair instead of reporting success for an inaccessible book.

**2026-10-03T05:59:27Z**

Implementation and isolated Linux rehearsal are complete. Keep this ticket partially implemented because a clean Docker build from the declared Docker Hub base remains unproved after metadata fetches stalled. Live proxy/HTTPS and real-volume facts remain separate gates in cb-irrm. No release or live migration was performed.

**2026-10-03T06:05:42Z**

Final committed source passed the isolated Linux production build again after browser fixes. The final image served the editor and clear404 page correctly, and retained the earlier session, saved revision, and private crop-original access. The disposable container is stopped. The clean declared-base build remains the only packaging proof gap.
