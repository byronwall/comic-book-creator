---
id: cb-f2t6
status: closed
deps: [cb-ud97]
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
- Reuse shared form/UI wrappers, Panda tokens, real POST actions, linked inline errors, visible labels, and password/username autocomplete. Keep SSR output deterministic and route components small.
- Honor the app base path in links, forms, API calls, redirects, and cookies. Keep account controls out of printed pages and private routes out of indexing.

Prove the visitor-to-account-to-book workflow, return sign-in, saving/sign-out, narrow layouts, keyboard use, and printing with disposable users. The public landing page must issue no private library query.

Keep the existing playful identity and editor/print features. Exclude verification/reset promises, public sharing, collaboration, admin/profile screens, and a broad editor redesign.

## Ready Gate

Construction requires the accepted server contract in cb-ud97. Signup/isolation and draft-safe transitions must pass before final acceptance. Confirm navigation/form contracts, safe demo assets, and the disposable browser target. Browser testing requires explicit authorization; inspect an existing server's data target before reuse. Use pnpm checks. Do not fill a missing example with private user content.

## Provenance

[Implementation plan](../docs/intent/multi-user-accounts/implementation-plan.md) — milestone 4. [Selected shape](../docs/intent/multi-user-accounts/shape-brief.md): disk-backed accounts with ownership added in place. [Intent](../docs/intent/multi-user-accounts/intent-brief.md) claims: landing, accounts, ownership, no-username, preserve, isolation. Repository baseline: `54282e8ef9348b33544d6ff0a9ffeb286b0d8cab`.


## Execution packet

Owner: landing worker. The public page depends on stable account URLs and the accepted server boundary. Registration POST behavior is verified. The draft worker owns private navigation and recovery. The public page can proceed on separate files while their browser proof remains open.

Change construction dependencies to cb-ud97. Retain every original acceptance criterion, including the complete visitor/account/book flow, responsive layout, keyboard access, base path, and printing. The epic still requires registration, draft protection, and private-library browser acceptance. Do not close this outcome before the combined flow passes.

Scope: public home route, reusable public-page components, a synthetic comic example, and route metadata. Reuse established comic colors and visual style. Never read private books or images. Parent already applied Impeccable and Solid SSR safety, with product/design context in app/PRODUCT.md and app/DESIGN.md. Use shared CSS variables now available on .comic-landing. Account forms and draft controls belong to other owners.

Proof: type-check and lint owned files; confirm the public page has no private query; run the Impeccable detector. Browser checks and PR screenshots remain required. Execution notes record their results.

## Notes

**2026-10-03T05:41:36Z**

The landing page is implemented with a synthetic comic illustration and no private library query. Targeted lint, type checks, and the Impeccable detector passed. Browser review confirmed mobile layout at 390x844 and working account entry. Auth button contrast was repaired after the first screenshot exposed missing comic variables outside the editor. New signup reached an empty library. Final combined editor and print checks continue.

**2026-10-03T06:12:46Z**

Combined browser acceptance passed: public landing at desktop and390px width, new signup into an empty library, return sign-in by keyboard, account-specific libraries, comic editing with save/reload, same-account draft recovery, stale-tab conflict handling, and editor print output without account controls. The synthetic landing performs no private-library query. Production /comics route/form/icon/cookie checks passed. Desktop and mobile screenshots are attached to PR4.
