---
id: cb-tt7r
status: open
deps: [cb-3g5e]
links: []
created: 2026-10-03T04:01:11Z
type: feature
priority: 1
assignee: Byron Wall
parent: cb-pix7
tags: [multi-user-accounts]
---
# Create separate accounts with isolated comic libraries

## Outcome

A new person can register with email/password and use an empty private library. Another account cannot read or change the legacy user's books, images, or inherited tools.

## Likely Steps

- Add a real POST signup form through the shared server-action/form conventions, with visible pending and error states.
- Apply consistent trimmed/lowercase email comparison without dot or plus rewriting. The proposed password policy allows 15–128 characters and spaces, without composition rules, trimming, or silent truncation.
- Serialize account creation and email uniqueness checks. Persist the account before creating its session. If session creation fails afterward, retain the account and direct the user to sign in.
- Reject signup for the already prepared legacy email. Registration never assigns old books or uses environment settings as an owner fallback.
- Start with zero books. Let the server assign new book IDs and owners; repeated titles are allowed. Do not recreate sample books.
- Use full document navigation at authentication changes and verify safe account summaries, cache separation, and private server output.

Prove A/B/anonymous access across listing, reads, saves, deletes, uploads, images, crop originals, and obsolete alternate endpoints. Forged book/owner values cannot change ownership. Race differently cased duplicate emails and preserve one account. Check expiry, revocation, and restart persistence. Account creation followed by failed session issuance is partial success; do not repeat creation or delete the account.

Keep disk-backed, single-process storage. Exclude mail delivery, verification/reset, profiles, roles, sharing, and multi-user inherited project tools.

## Ready Gate

Private legacy-account access must be closed, including alternate API/action/media guards. Before ready, inspect the registry/session contract and resolve disposable A/B fixture setup. Confirm test/browser authorization and use pnpm checks. Public signup must remain unavailable until the server boundary is complete. Draft-loss and old-tab mutation handling have their own ticket.

## Provenance

[Implementation plan](../docs/intent/multi-user-accounts/implementation-plan.md) — milestone 3 registration and isolation scope. [Selected shape](../docs/intent/multi-user-accounts/shape-brief.md): disk-backed accounts with ownership added in place. [Intent](../docs/intent/multi-user-accounts/intent-brief.md) claims: accounts, ownership, bootstrap, disk, single-process, seeding, inherited-scope, isolation, no-email. Repository baseline: `54282e8ef9348b33544d6ff0a9ffeb286b0d8cab`.
