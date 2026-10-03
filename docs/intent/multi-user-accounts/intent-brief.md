---
title: "Comic Book Creator accounts"
slug: "multi-user-accounts"
phase: intent
status: current
last_updated: "2026-10-03"
---

# Comic Book Creator accounts

## My read

Comic Book Creator needs to become a site where separate people can keep separate libraries. A visitor should understand the product before creating an account. After registration or sign-in, that person should see only their own books. The current editor, image tools, autosave, and print features should continue to work.

The first priority is the data model and the safe transfer of existing work. The current site acts as one shared user. All existing books must become the property of one account. An environment variable must supply that account's email address. This assignment must preserve book IDs, pages, text, uploaded images, and original photos used for crop edits.

The requested account system uses email and password. Disk storage remains acceptable. There is no requirement for a database, external identity service, Resend, verification email, or password reset flow. This release should establish a sound account boundary without building a larger account-management product.

The initial request limited work to planning. The later request authorizes implementation, checkpoint commits, and stacked pull requests. The user also approved focused tests and browser checks on disposable data. Live migration and deployment require separate rollout approval. Tickets own the current execution state.

## What matters most

- Preserve every existing file before changing ownership records.
- Give each account a stable identity separate from its email address.
- Enforce ownership on the server for both books and images.
- Make migration repeatable without reassignment, duplicate accounts, or silent overwrites.
- Keep the implementation small enough for one server and one deployed version.

## The experience you want

The public home page explains how to build and print a comic book. It shows a representative example and offers account creation and sign-in. A new account starts with an empty library and a clear create-book action. Creating, opening, editing, saving, deleting, uploading, and printing remain familiar.

The existing user signs into the migrated account and finds the same books. Existing book links still reach those books after sign-in. Other accounts cannot open those links or retrieve their images. A failed or expired session must produce a useful message without silently replacing an editor's unsaved work.

The site does not promise email delivery or recovery features. Email acts as a login identifier in this release. Registering an address does not prove mailbox ownership. The legacy account therefore needs a locally set password before public registration becomes available.

## Boundaries

### Must be true

- The landing page is public; saved libraries and their media require an account.
- Registration, sign-in, and sign-out use email/password accounts and server-checked sessions.
- `LEGACY_USER_EMAIL` selects the existing account during migration.
- Migration preserves existing content and produces a checked backup and a comparison report.
- A failed migration leaves the site closed to writes until recovery completes.

### Must be avoided

- Public registration that claims the legacy account merely by matching its email address.
- Assigning missing ownership to the legacy user during normal requests.
- Running record normalization as a substitute for a data-preserving migration.
- Exposing old APIs, server actions, images, or cached responses outside the account boundary.
- Adding verification, reset, email delivery, social login, teams, roles, or sharing to this release.

## What seems settled

Keep SolidStart, SolidJS, TypeScript, Panda, and server disk storage. Retain the comic editor and shared UI controls. Prefer a single offline migration and one account-aware runtime. No parallel old/new storage service is needed.

The account password cannot be derived from the email setting. The plan recommends a hidden terminal prompt during migration. This is an initial credential setup, not a website reset flow.

## Current reality that matters

At revision `54282e8`, the home route is the shared book library. There is no user table, session store, or ownership field. Local inspection found six books, 30 pages, 66 text elements, and nine comic image files. All inspected image references resolve, including the original photo for a crop edit. These are local counts, not a production inventory.

The repository also contains project, spatial-map, and AI workflow APIs. Their files must survive migration. The proposed scope keeps those inherited tools accessible only to the legacy account. Extending them to every account remains separate work.

## Next step after confirmation

Use the [implementation plan](implementation-plan.md) and [ticket epic](../../../.tickets/cb-pix7.md) when implementation is requested. First refine the [migration proof](../../../.tickets/cb-xp5r.md) against the current repository and disposable data. The actual legacy email and password are operator inputs at migration time. Neither is needed to finish ticket preparation.
