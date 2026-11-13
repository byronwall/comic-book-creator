# ComicBam

## Audience and purpose

This personal project helps families make printable comic books.
People choose page layouts, add text or photos, and print their stories.

## Accounts

Each person has a private account with a username and password.
Books and images stay in disk storage. The live library moved to accounts in October 2026.

Visitors start on a public home page with a synthetic comic example.
New users create an account and enter an empty library.
Returning users sign in and open their saved books.

## Product boundaries

There is one server process and one deployed version.
The app has no contact service or self-service password reset flow.
The configured admin can reset passwords, disable accounts, and delete accounts and their libraries.
The app has no public sharing, collaboration, configurable account roles, or profile settings.
ADMIN_USERNAME selects the account allowed to use /admin.
Admin views show user activity and aggregate library statistics, without private book content.
Activity records stay until the owner decides to remove them.
Inherited project tools remain available only to the original owner account.

## Experience requirements

Keep the existing comic identity and editing tools.
Use clear labels, visible form errors, and keyboard access.
Keep account controls out of printed pages.
Keep unsaved work visible when a session expires or an account changes.
Never show private books or photos in public examples.

## Decision source

[Account storage setup](../docs/account-migration.md) records how accounts work and how to run them.
The closed `multi-user-accounts` initiative is in [initiative history](../docs/initiative-history.json).
