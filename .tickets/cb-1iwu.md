---
id: cb-1iwu
status: closed
deps: [cb-5ap7]
links: []
created: 2026-10-05T03:11:04Z
type: feature
priority: 2
assignee: Codex
tags: [admin, ui]
---
# Build the admin user table and event ledger

Build /admin using the existing comic style and reference user-table/event-ledger patterns. Show activity totals, searchable account aggregates, account actions, persistent event filters, storage usage, and admin-only navigation. Use query/createResource and form-backed actions. Preserve SSR shape. No AI or library maintenance.

## Acceptance Criteria

Configured admin can load data, filter users/events by user/type/date, inspect counts and storage, reset passwords, disable/enable and confirm deletion. Show loading, empty, failure, pending, and success states. Nonadmins have no Admin navigation. Required checks: TypeScript, lint, build, source review of server gates and SSR. Browser verification is excluded by project guidance until requested.


## Notes

**2026-10-05T03:16:42Z**

Server contract is implemented but awaiting security review. UI can proceed against AdminSnapshot and manageUser; final acceptance remains dependent on cb-5ap7. No browser checks are authorized by the project instructions.

**2026-10-05T03:23:45Z**

UI source review found stale action selection after disabling/enabling a selected account and missing deleted accounts from event filters. Fixed by resetting action state on status change/results and deriving ledger identities from retained events as well as current users. Combined TypeScript/build checks passed before these focused fixes; rerunning affected checks. No browser proof is claimed.

**2026-10-05T03:25:08Z**

Final acceptance evidence: TypeScript passed after the focused UI fixes; targeted admin/UI lint passed with zero warnings or errors; production build passed on the combined source state; independent source review accepted account-action state, retained/deleted event filters, native forms, server gates, private-content restraint, and responsive table/label structure. Mechanical design detector reported no findings. Dates use fixed UTC formatting for SSR parity. Browser interaction, visual screenshots, and runtime tests were not run, per project scope. Base is fddea17 plus the owned admin UI/nav/design/guidance diff. UI outcome accepted within this source/build verification scope.
