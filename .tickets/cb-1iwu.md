---
id: cb-1iwu
status: in_progress
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
