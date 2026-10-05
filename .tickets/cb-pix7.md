---
id: cb-pix7
status: closed
deps: [cb-xp5r, cb-3g5e, cb-tt7r, cb-jqfr, cb-f2t6, cb-t8jr, cb-irrm]
links: []
created: 2026-10-03T04:01:11Z
type: epic
priority: 1
assignee: Byron Wall
tags: [multi-user-accounts]
---
# Add private comic accounts without losing legacy data

## User name signup update — 2026-10-03

User names now replace the previous account identifier throughout the app, stored accounts, sessions, forms, and configuration.
LEGACY_USERNAME selects the first signup that claims legacy data. That signup uses its chosen password.
Startup validates pending storage but does not migrate it. A complete verified persistent copy still precedes source changes.
Byron explicitly selected first matching signup ownership, with no additional claim code. Other signup waits until completion.
This update and the current migration guide supersede previous startup-password and offline-only setup instructions below.


## Outcome

Visitors understand Comic Book Creator, create username/password accounts, and keep separate comic libraries. The existing library belongs to one account selected by LEGACY_USERNAME. All existing creative content and files survive the transition.

## Likely Steps

- Prove an offline ownership migration on disposable data before changing the live site.
- Enable private legacy-account use, then separate-account registration and safe draft handling.
- Add the landing page and account navigation while keeping the comic editor and print tools.
- Package and rehearse deployment separately from the authorized live cutover.

Keep one server, disk storage, stable user IDs, book ownership/revisions, and persistent server sessions. Preserve inherited project/spatial data behind a legacy-account guard. Exclude username services, verification/reset, database relocation, teams, sharing, and broad editor redesign.

Completion requires preservation comparisons, access-isolation proof, account-switch/save-conflict proof, the visitor workflow, and an authorized deployment check. A backup restore becomes unsafe after new users or edits exist; preserve later work and repair forward.

## Ready Gate

This epic tracks child acceptance. Dependencies on every child determine completion. The user authorized implementation, focused tests, browser checks, chunk commits, and stacked PRs. Live migration and deployment still require separate approval. Runtime measurements and deployment facts remain release gates.

## Provenance

[Implementation plan](../docs/intent/multi-user-accounts/implementation-plan.md) — milestones 1–5. [Selected shape](../docs/intent/multi-user-accounts/shape-brief.md): disk-backed accounts with ownership added in place. [Intent](../docs/intent/multi-user-accounts/intent-brief.md) claims: preserve, legacy-username, accounts, landing, disk, no-username, planning-only, ownership, bootstrap, in-place, inherited-scope, single-process, seeding, raw-migration, isolation. Repository baseline: `54282e8ef9348b33544d6ff0a9ffeb286b0d8cab`.


## Notes

**2026-10-03T06:15:55Z**

Implementation is committed in seven stacked PRs: #1 migration, #2 private accounts, #3 signup, #5 draft safety, #4 landing, #6 release packaging, and #7 browser fixes. The top branch is codex/accounts-07-browser-fixes. Migration, server contract, private-library browser access, signup, draft recovery, and landing tickets passed acceptance. Release packaging remains partially implemented only for a clean Docker Hub base-image build; isolated Linux build/migration/restart checks passed. Live rollout cb-irrm remains open and unauthorized. No actual app/data was changed.

**2026-10-03T06:21:59Z**

Final production build passed at 981a083 after the recovery layout fix. All 16 focused tests, type checks, HTTP isolation checks, and combined browser acceptance passed. The screenshot evidence is attached to the stack. The preview uses disposable data on port 3002. The clean declared-base Docker build and separately approved live rollout remain outstanding.

**2026-10-05T03:11:04Z**

All account child work is complete. Byron confirmed successful live migration. Legacy cleanup is PR #10; admin work is a separate scope.
