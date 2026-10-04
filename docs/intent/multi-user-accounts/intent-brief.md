---
title: "Comic Book Creator accounts"
slug: "multi-user-accounts"
phase: intent
status: current
last_updated: "2026-10-03"
---

# Comic Book Creator accounts

## User name signup update — 2026-10-03

User names now replace the previous account identifier throughout the app, stored accounts, sessions, forms, and configuration.
LEGACY_USERNAME selects the first signup that claims legacy data. That signup uses its chosen password.
Startup validates pending storage but does not migrate it. A complete verified persistent copy still precedes source changes.
Byron explicitly selected first matching signup ownership, with no additional claim code. Other signup waits until completion.
This update and the current migration guide supersede previous startup-password and offline-only setup instructions below.


## My read

Comic Book Creator needs to become a site where separate people can keep separate libraries. A visitor should understand the product before creating an account. After registration or sign-in, that person should see only their own books. The current editor, image tools, autosave, and print features should continue to work.

The first priority is the data model and the safe transfer of existing work. The current site acts as one shared user. All existing books must become the property of one account. An environment variable must supply that account's user name. This assignment must preserve book IDs, pages, text, uploaded images, and original photos used for crop edits.

The requested account system uses username and password. Disk storage remains acceptable. There is no requirement for a database, external identity service, Resend, identity verification, or password reset flow. This release should establish a sound account boundary without building a larger account-management product.

The initial request limited work to planning. The later request authorizes implementation, checkpoint commits, and stacked pull requests. The user also approved focused tests and browser checks on disposable data. Live migration and deployment require separate rollout approval. Tickets own the current execution state.

## What matters most

- Preserve every existing file before changing ownership records.
- Give each account a stable identity separate from its user name.
- Enforce ownership on the server for both books and images.
- Make migration repeatable without reassignment, duplicate accounts, or silent overwrites.
- Keep the implementation small enough for one server and one deployed version.

## The experience you want

The public home page explains how to build and print a comic book. It shows a representative example and offers account creation and sign-in. A new account starts with an empty library and a clear create-book action. Creating, opening, editing, saving, deleting, uploading, and printing remain familiar.

The existing user signs into the migrated account and finds the same books. Existing book links still reach those books after sign-in. Other accounts cannot open those links or retrieve their images. A failed or expired session must produce a useful message without silently replacing an editor's unsaved work.

User names identify accounts without a contact address. The first signup matching LEGACY_USERNAME claims the legacy library with its chosen password. Other accounts can register after that migration completes.

## Boundaries

### Must be true

- The landing page is public; saved libraries and their media require an account.
- Registration, sign-in, and sign-out use username/password accounts and server-checked sessions.
- `LEGACY_USERNAME` selects the existing account during migration.
- Migration preserves existing content and produces a checked backup and a comparison report.
- A failed migration leaves the site closed to writes until recovery completes.

### Must be avoided

- Account claim codes or separate identity checks; first matching signup ownership is explicitly approved.
- Assigning missing ownership to the legacy user during normal requests.
- Running record normalization as a substitute for a data-preserving migration.
- Exposing old APIs, server actions, images, or cached responses outside the account boundary.
- Adding verification, reset, contact delivery, social login, teams, roles, or sharing to this release.

## What seems settled

Keep SolidStart, SolidJS, TypeScript, Panda, and server disk storage. Retain the comic editor and shared UI controls. Prefer a single offline migration and one account-aware runtime. No parallel old/new storage service is needed.

Matching signup chooses the legacy account password. The user name setting never determines that password. Interrupted signup requires the original chosen password to resume.

## Current reality that matters

At revision `54282e8`, the home route is the shared book library. There is no user table, session store, or ownership field. Local inspection found six books, 30 pages, 66 text elements, and nine comic image files. All inspected image references resolve, including the original photo for a crop edit. These are local counts, not a production inventory.

The repository also contains project, spatial-map, and AI workflow APIs. Their files must survive migration. The proposed scope keeps those inherited tools accessible only to the legacy account. Extending them to every account remains separate work.

## Next step after confirmation

Use the [implementation plan](implementation-plan.md) and [ticket epic](../../../.tickets/cb-pix7.md) when implementation is requested. First refine the [migration proof](../../../.tickets/cb-xp5r.md) against the current repository and disposable data. The actual legacy username and password are operator inputs at migration time. Neither is needed to finish ticket preparation.
