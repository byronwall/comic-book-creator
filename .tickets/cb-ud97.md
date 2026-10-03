---
id: cb-ud97
status: closed
deps: [cb-xp5r]
links: []
created: 2026-10-03T05:02:51Z
type: task
priority: 1
assignee: Byron Wall
parent: cb-3g5e
tags: [multi-user-accounts]
---
# Accept the private account server contract

Record the accepted server boundary from cb-3g5e so dependent implementation can continue while browser access is unavailable. This ticket does not replace or close the parent browser acceptance.

## Acceptance Criteria

Disk sessions, ownership, revisions, Origin and account-context checks, private media, inherited route/action guards, native auth forms, and production restart pass on disposable data.


## Notes

**2026-10-03T05:03:15Z**

Accepted at 7a4d9c9 with the current stream-revocation regression added. Root reviewed the storage worker and request guards. Evidence: 46 HTTP checks passed before and after production restart; native auth POSTs, cookie flags, safe deep-link returns, and logout revocation passed; focused storage tests 5/5, auth tests 3/3, migration tests 4/4; build and type-check passed; full lint passed with warnings. No credentials or live data were used.

The parent cb-3g5e retains all browser acceptance and remains unfinished. This split records an integrated prerequisite; it removes no required proof.
