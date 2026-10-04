---
id: cb-xp5r
status: closed
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

Add a runnable offline migration that assigns all existing comics to one prepared account without losing files or content.

## Readiness and ownership

Base: f6ca709 on codex/accounts-01-migration. No prerequisites. Parent owns Git and ticket state; the migration worker owns account storage/password primitives, atomic disk writes, migration commands, and focused fixture tests. Use temporary directories only. The user authorized focused tests and browser checks on disposable data on 2026-10-03. No production migration is authorized.

## Decisions

Must: require an explicit absolute data target; read LEGACY_USERNAME for legacy data; use hidden password input. Keep book IDs, nested JSON values, timestamps, image paths/bytes, crop originals, unknown files, and auxiliary project/spatial data. Add only ownerUserId and revision 1 to raw book records. Never call read-time seed or editor normalization functions.

Must: back up the stopped source outside its tree and verify the manifest. Stage atomic replacements, persist a journal containing source/target hashes and the chosen account, and write completion state last. Reuse that account after interruption. Matching completed reruns do nothing; a different username or unexpected file hash must stop. Fail clearly on malformed JSON, duplicate/mismatched IDs, invalid image paths, missing crop/display sources, or conflicting owners. Never skip failed records.

Account contracts: User has id, normalized username, passwordHash, createdAt. UserStore has schemaVersion 1 and users. DataState has schemaVersion 2, legacyUserId or null, migrationId, completedAt. Book ownership is in-place. Use built-in async scrypt with self-describing salted hashes; no secret or plaintext in stored state. Explicit initialization supports only genuinely empty data.

Prefer: small TypeScript modules and a pnpm-run command with tsx if needed. Keep newly expanded files around 200–300 lines. Free: internal naming and fixture organization. Exclude: runtime route guards, signup UI, storage relocation, database conversion, automatic cleanup, and production operations.

## Acceptance

- Invariant: every source file is accounted for; all existing book values match after excluding only new ownership/revision fields.
- Invariant: image and auxiliary bytes remain identical; raw crop originals remain reachable.
- Fixture: rerun and interruption after a committed book preserve one account and checked recovery.
- Fixture: malformed JSON, missing images, changed username, foreign ownership, and unexpected hashes fail without silent replacement.
- Fixture: empty initialization succeeds; nonempty legacy data cannot masquerade as a fresh installation.
- Prove with actual temporary filesystem operations and focused tests. Run pnpm type-check and targeted lint. Report fixture commands and remaining limitations before closure.

## Provenance

Implementation plan milestone 1 and storage/password strategy. Claims: preserve, legacy-username, disk, bootstrap, in-place, single-process, seeding, raw-migration, isolation. Original repository baseline 54282e8. Full plan: ../docs/intent/multi-user-accounts/implementation-plan.md.

## Execution checkpoint

Owner: root coordinates; migration worker writes the scoped modules. Next: implement and verify on disposable fixtures, then parent reviews and commits. Existing app/data is read-only evidence, never a test target.

## Notes

**2026-10-03T04:28:11Z**

Parent proof checkpoint: the CLI dry run, hidden password entry and confirmation, migration apply, verification, and matching apply rerun passed against tmp/accounts-proof/legacy. This synthetic fixture contains one book, edited image, crop original, inherited file, and unknown binary file. A separate comparison matched all five source files against the checked backup. Only ownerUserId and revision were added to the book.

The first terminal run exposed a destroyed stdin stream between password prompts. The repaired prompt passed both entries. Independent review found dry-run preflight and interrupted empty-init gaps; the writer is adding those regression checks. Parent also found and fixed the backup-manifest filename collision through the writer. No live data was used.

Next: accept the writer's final checks, review the final diff, and commit the migration chunk.

**2026-10-03T04:34:04Z**

Accepted implementation and proof: four focused filesystem tests passed. They cover content and byte preservation, matching and changed-username reruns, interrupted-book recovery, malformed records, missing crop originals, existing ownership, changed hashes, manifest filename preservation, and empty initialization recovery. Type-check passed. The final CLI verify passed after the module split. Independent review findings are repaired.

Targeted ESLint could not load the existing config because @eslint/js is absent from the installed package tree. This is an existing tooling defect; the release checks will repair it before final integration. No lint pass is claimed here.

Checked state: migration/auth primitive files and CLI added over f6ca709; parent-reviewed working diff. Migration commands use Node native TypeScript stripping with explicit .ts imports. Backup source files are under backup/files; backup metadata stays outside that source copy.
