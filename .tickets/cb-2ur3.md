---
id: cb-2ur3
status: closed
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

**2026-10-05T03:31:05Z**

Independent clean-room browser evidence on localhost:3100: dev sign-in succeeded; overview shows four synthetic users and one disabled account; friend details show aggregate library counts and account controls; disable/enable selector states worked without submitting mutations; friend + Book opened + matching UTC date filters returned the expected single event. Phone 390x844 had no page-level horizontal overflow; tables scroll horizontally. No console warnings/errors observed. Worker did not read source or alter data. Actual JPEG screenshots: tmp/admin-overview.jpg, tmp/admin-user-controls.jpg, tmp/admin-event-ledger.jpg, tmp/admin-mobile.jpg. Remaining step: attach these images to the stacked PR with gh.

**2026-10-05T03:31:48Z**

Parent screenshot review found the mobile Admin nav link overlapped account controls at 390px, despite no document overflow. Added a second navigation row for admin accounts on narrow screens. Requesting one focused phone recapture and navigation check before attaching evidence.

**2026-10-05T03:34:23Z**

Final confirmation: independent phone recapture at 390x844 shows Admin, avatar, and Sign out without overlap; user/ledger controls remain visible, with horizontally scrollable tables and no page-level overflow or console warnings. Type-check, nav lint, and production build passed at 33c58f8. PR #11 created at https://github.com/byronwall/comic-book-creator/pull/11, based on codex/remove-legacy-account-migration (PR #10). Verified its body contains four GitHub uploaded screenshot URLs. Images are ignored local evidence, not committed. Demo remains running at localhost:3100 on disposable storage. Requested evidence and PR outcome accepted.
