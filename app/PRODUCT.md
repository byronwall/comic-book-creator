# Comic Book Creator

## Audience and purpose

This personal project helps families make printable comic books.
People choose page layouts, add text or photos, and print their stories.

## Current work

Add private accounts with email and password.
Keep disk storage and preserve all existing books and images.
An offline command assigns existing data to the configured legacy email.

Visitors start on a public home page with a synthetic comic example.
New users create an account and enter an empty library.
Returning users sign in and open their saved books.

## Product boundaries

There is one server process and one deployed version.
The app has no email delivery, verification, or password reset flow.
The app has no public sharing, collaboration, account roles, or profile settings.
Inherited project tools remain available only to the legacy account.

## Experience requirements

Keep the existing comic identity and editing tools.
Use clear labels, visible form errors, and keyboard access.
Keep account controls out of printed pages.
Keep unsaved work visible when a session expires or an account changes.
Never show private books or photos in public examples.

## Decision source

The accepted plan is `../docs/intent/multi-user-accounts/implementation-plan.md`.
The user approved implementation and checks on disposable data.
Live rollout requires a separate decision.
