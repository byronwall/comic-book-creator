---
id: cb-5ap7
status: closed
deps: []
links: []
created: 2026-10-05T03:11:04Z
type: feature
priority: 2
assignee: Codex
tags: [admin]
---
# Add admin access, account controls, and activity storage

On codex/admin-system, based on be3c17d (PR #10), add ADMIN_USERNAME access, safe account inspect/reset/disable/delete, aggregate comic storage, and persistent user events. Preserve existing accounts. Exclude AI and library maintenance. Use existing sessions, disk storage, and serialized writes. Owner: current writer.

## Acceptance Criteria

Server rejects nonadmins; disabled users cannot sign in or use sessions, including demo sessions; reset revokes sessions; admin self-disable/delete is rejected; deletion removes owned books/photos and clears tool ownership if needed; no hashes or private content reach snapshots; writes emit activity without passwords; events persist without automatic pruning. Proof: type checking, targeted lint, build, and independent security diff review. No browser testing unless requested.


## Notes

**2026-10-05T03:16:42Z**

Server implementation is present on codex/admin-system. Includes admin gates, aggregate-only snapshots, session revocation, disabled-account checks, persistent JSONL events, and a shared account write queue for deletion versus comic writes. Independent read-only security review is running. Remaining checks: TypeScript, targeted lint, combined build.

**2026-10-05T03:20:20Z**

Independent security review found password reset could change the password before a damaged session record stopped revocation. Fixed by revoking first, then persisting the hash. Sign-out events now follow successful revocation. No cross-user access or aggregate privacy defect found. Follow-up review and combined checks remain.

**2026-10-05T03:22:16Z**

Acceptance evidence: TypeScript passed; targeted ESLint found zero errors (import-style warnings in Node CLI shared modules remain); production build passed; independent security review accepted authorization, disabled-account/session behavior, reset ordering, deletion serialization, owner-state clearing, and aggregate privacy. Reviewed current owned diff atop be3c17d. No runtime tests or browser checks were run, per project scope. Server outcome accepted.
