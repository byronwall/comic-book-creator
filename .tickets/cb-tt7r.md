---
id: cb-tt7r
status: closed
deps: [cb-ud97]
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

A new person can register with username/password and use an empty private library. Another account cannot read or change the legacy user's books, images, or inherited tools.

## Likely Steps

- Add a real POST signup form through the shared server-action/form conventions, with visible pending and error states.
- Apply consistent trimmed/lowercase username comparison without dot or plus rewriting. The proposed password policy allows 15–128 characters and spaces, without composition rules, trimming, or silent truncation.
- Serialize account creation and username uniqueness checks. Persist the account before creating its session. If session creation fails afterward, retain the account and direct the user to sign in.
- Reject signup for the already prepared legacy username. Registration never assigns old books or uses environment settings as an owner fallback.
- Start with zero books. Let the server assign new book IDs and owners; repeated titles are allowed. Do not recreate sample books.
- Use full document navigation at authentication changes and verify safe account summaries, cache separation, and private server output.

Prove A/B/anonymous access across listing, reads, saves, deletes, uploads, images, crop originals, and obsolete alternate endpoints. Forged book/owner values cannot change ownership. Race differently cased duplicate usernames and preserve one account. Check expiry, revocation, and restart persistence. Account creation followed by failed session issuance is partial success; do not repeat creation or delete the account.

Keep disk-backed, single-process storage. Exclude mail delivery, verification/reset, profiles, roles, sharing, and multi-user inherited project tools.

## Ready Gate

The private server boundary must be accepted in cb-ud97, including alternate API/action/media guards. Full browser acceptance remains in cb-3g5e. Before ready, inspect the registry/session contract and resolve disposable A/B fixture setup. Confirm test/browser authorization and use pnpm checks. Public signup must remain unavailable until the server boundary is complete. Draft-loss and old-tab mutation handling have their own ticket.

## Provenance

[Implementation plan](../docs/intent/multi-user-accounts/implementation-plan.md) — milestone 3 registration and isolation scope. [Selected shape](../docs/intent/multi-user-accounts/shape-brief.md): disk-backed accounts with ownership added in place. [Intent](../docs/intent/multi-user-accounts/intent-brief.md) claims: accounts, ownership, bootstrap, disk, single-process, seeding, inherited-scope, isolation, no-username. Repository baseline: `54282e8ef9348b33544d6ff0a9ffeb286b0d8cab`.

## Execution packet

Owner: root. Base: 7a4d9c9 on codex/accounts-03-signup.
The prerequisite server contract is integrated and verified. Its browser proof remains open because browser automation is unavailable. Continue implementation without closing either outcome until the missing proof passes.

Scope: registration service/action, shared account form, sign-up route, and focused uniqueness checks. Reuse strict account storage, passwordWork, session issuance, and full document redirects. Validate username consistently and preserve password spaces. Commit the account before creating its session. Show a sign-in recovery link on partial success; do not remove the account or retry account creation.

Proof: case-insensitive duplicate race leaves one account. New account has no books. Legacy username cannot claim existing data. Check the native POST action and A/B/anonymous isolation on disposable data. Browser signup and account-cache checks remain required before closure. No username, verification, reset, or profile work.

## Notes

**2026-10-03T05:08:38Z**

Implementation and server proof passed. Four auth tests cover sessions, stream revocation, Origin/context checks, duplicate-username races, and registration validation. Native signup POST created an empty library. The prepared legacy username was rejected. A forced session-directory failure retained the newly created account, and sign-in succeeded after restoring the directory.

The no-JavaScript failure path exposed a framework flash-cookie behavior: SolidStart includes submitted form input. Both auth actions now remove the password field in finally blocks. HTTP checks proved failed login/signup flash responses contain no password.

Type-check and targeted lint passed. Browser signup, cache transition, and visual proof remain pending while browser access is unavailable. Keep this ticket unfinished until that proof passes.

**2026-10-03T05:59:27Z**

Browser acceptance passed on disposable accounts. A new account completed signup and reached an empty library. The existing second account also signed in by keyboard and saw an empty library. Server checks already covered duplicate username races, legacy-username rejection, private A/B operations, password-free failed-form responses, and retained accounts after session-creation failure. Draft/account-switch recovery remains owned by cb-jqfr.
