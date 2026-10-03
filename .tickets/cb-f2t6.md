---
id: cb-f2t6
status: open
deps: [cb-tt7r, cb-jqfr]
links: []
created: 2026-10-03T04:01:11Z
type: feature
priority: 2
assignee: Byron Wall
parent: cb-pix7
tags: [multi-user-accounts]
---
# Explain the site and connect account entry flows

## Outcome

A visitor understands how to make and print comics, creates an account, and reaches their private library. Existing book links still work after sign-in. Account navigation respects pending edits.

## Likely Steps

- Make the home route a public explanation with a representative example and clear account-creation/sign-in actions.
- Explain layouts, text/photos, and print options using a repository-owned or synthetic demo. Never fetch a real user's book or private image for marketing.
- Keep the private library at /books and the existing editor URLs. Show the current account, useful empty states, and safe sign-out navigation.
- Reuse shared form/UI wrappers, Panda tokens, real POST actions, linked inline errors, visible labels, and password/email autocomplete. Keep SSR output deterministic and route components small.
- Honor the app base path in links, forms, API calls, redirects, and cookies. Keep account controls out of printed pages and private routes out of indexing.

Prove the visitor-to-account-to-book workflow, return sign-in, saving/sign-out, narrow layouts, keyboard use, and printing with disposable users. The public landing page must issue no private library query.

Keep the existing playful identity and editor/print features. Exclude verification/reset promises, public sharing, collaboration, admin/profile screens, and a broad editor redesign.

## Ready Gate

Signup/isolation and draft-safe account transitions must be closed. Before ready, confirm navigation/form contracts, safe demo assets, and the disposable browser target. Browser testing requires explicit authorization; inspect an existing server's data target before reuse. Use pnpm checks. Do not fill a missing example with private user content.

## Provenance

[Implementation plan](../docs/intent/multi-user-accounts/implementation-plan.md) — milestone 4. [Selected shape](../docs/intent/multi-user-accounts/shape-brief.md): disk-backed accounts with ownership added in place. [Intent](../docs/intent/multi-user-accounts/intent-brief.md) claims: landing, accounts, ownership, no-email, preserve, isolation. Repository baseline: `54282e8ef9348b33544d6ff0a9ffeb286b0d8cab`.

