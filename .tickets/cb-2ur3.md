---
id: cb-2ur3
status: in_progress
deps: []
links: []
created: 2026-10-05T03:26:43Z
type: task
priority: 2
assignee: Codex
tags: [admin, evidence]
---
# Prepare admin demo evidence and stacked pull request

User requested screenshots in the admin PR and authorized demo fixture updates. Use only app/tmp/dev-data, synthetic accounts and book files. Port 3000 belongs to evidence-first-resume-studio; port 3100 is free. Capture the admin overview, selected-user controls and ledger, plus a phone view if supported. Create PR based on codex/remove-legacy-account-migration and upload images with gh --attach.

## Acceptance Criteria

Demo command exposes dev as admin and includes users with library activity and disabled status. Independent browser pass can navigate admin, inspect a selected user and filter retained events. Images are saved in project tmp and attached to PR. Type-check/lint for changed demo scripts pass. No real user storage is read or changed.


## Notes

**2026-10-05T03:27:35Z**

Seeded four synthetic demo users, six books and 16 events in app/tmp/dev-data. Demo ADMIN_USERNAME defaults to dev. Type-check passed; demo-script lint has no errors, with Node explicit-path import warnings. Port 3000 is unrelated. Sandboxed bind failed; retrying pnpm dev:demo with local-server permission on 3100.
