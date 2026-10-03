---
id: cb-pix7
status: open
deps: [cb-xp5r, cb-3g5e, cb-tt7r, cb-jqfr, cb-f2t6, cb-t8jr, cb-irrm]
links: []
created: 2026-10-03T04:01:11Z
type: epic
priority: 1
assignee: Byron Wall
tags: [multi-user-accounts]
---
# Add private comic accounts without losing legacy data

## Outcome

Visitors understand Comic Book Creator, create email/password accounts, and keep separate comic libraries. The existing library belongs to one account selected by LEGACY_USER_EMAIL. All existing creative content and files survive the transition.

## Likely Steps

- Prove an offline ownership migration on disposable data before changing the live site.
- Enable private legacy-account use, then separate-account registration and safe draft handling.
- Add the landing page and account navigation while keeping the comic editor and print tools.
- Package and rehearse deployment separately from the authorized live cutover.

Keep one server, disk storage, stable user IDs, book ownership/revisions, and persistent server sessions. Preserve inherited project/spatial data behind a legacy-account guard. Exclude email services, verification/reset, database relocation, teams, sharing, and broad editor redesign.

Completion requires preservation comparisons, access-isolation proof, account-switch/save-conflict proof, the visitor workflow, and an authorized deployment check. A backup restore becomes unsafe after new users or edits exist; preserve later work and repair forward.

## Ready Gate

This epic tracks child completion; it is not an execution packet. All children remain open until their frontier review. Dependencies on every child determine completion. Ticket creation authorizes no code implementation, browser tests, production migration, or deployment. No new product decision blocks fan-out. Runtime measurements and deployment facts remain child readiness gates.

## Provenance

[Implementation plan](../docs/intent/multi-user-accounts/implementation-plan.md) — milestones 1–5. [Selected shape](../docs/intent/multi-user-accounts/shape-brief.md): disk-backed accounts with ownership added in place. [Intent](../docs/intent/multi-user-accounts/intent-brief.md) claims: preserve, legacy-email, accounts, landing, disk, no-email, planning-only, ownership, bootstrap, in-place, inherited-scope, single-process, seeding, raw-migration, isolation. Repository baseline: `54282e8ef9348b33544d6ff0a9ffeb286b0d8cab`.

