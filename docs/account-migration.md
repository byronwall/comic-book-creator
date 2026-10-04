# Account setup and migration

The app uses one Node process and disk storage. Run only one writer against each data directory.
The app never creates accounts or migrates existing data during a request.

This guide describes release operations. It does not authorize a live migration.

## Settings

| Setting | Use |
| --- | --- |
| `APP_DATA_DIR` | Absolute data directory. Local development defaults to `app/data`. |
| `APP_ORIGIN` | Exact browser origin, such as `https://comics.example.com`. Omit trailing slashes and paths. |
| `BASE_PATH` | App path, such as `/` or `/comics`. Use the same value during build and startup. |
| `LEGACY_USER_EMAIL` | Legacy account email for the offline migration only. |
| `MIGRATION_BACKUP_DIR` | Optional backup parent outside the data tree. Compose uses `/app/backups`. |

Email comparison trims outer spaces and ignores case. It preserves dots and plus signs.
Passwords use 15–128 characters. Spaces are allowed and are not trimmed.
The app has no verification email or password reset flow.

Use Node 22.6 or later and pnpm 11.9.0. Migration scripts use Node's TypeScript support.

## New local installation

Run these commands from `app/`:

```sh
pnpm install
export APP_DATA_DIR="$PWD/data"
export APP_ORIGIN=http://localhost:3000
pnpm accounts:init-empty --data-dir "$APP_DATA_DIR"
pnpm dev
```

Empty initialization rejects existing data. It can resume an interrupted setup containing only an empty account registry.
Open the site and create an account. A new library contains no sample books.

## Existing local data

Stop the old app before migration. Do not let old and new code write to the same directory.
Use a stopped copy for rehearsal before selecting a live target.

```sh
export APP_DATA_DIR=/absolute/path/to/data-copy
export LEGACY_USER_EMAIL=legacy@example.com
export MIGRATION_BACKUP_DIR=/absolute/path/to/backups
pnpm accounts:migrate --data-dir "$APP_DATA_DIR" --dry-run
pnpm accounts:migrate --data-dir "$APP_DATA_DIR" --apply
pnpm accounts:verify --data-dir "$APP_DATA_DIR"
```

Apply asks for the initial password twice without showing it. Never pass the password as a command argument.
The optional `--backup-dir` argument overrides `MIGRATION_BACKUP_DIR`.
Without either setting, the command puts its backup beside the data directory.

The command rejects malformed records, missing image sources, conflicting owners, and unexpected file changes.
Do not remove failed records to make migration pass. Repair the source copy and run the checks again.

## Docker release

Set `APP_ORIGIN`, `BASE_PATH`, and `LEGACY_USER_EMAIL` for Compose before these commands.
The runtime image includes pnpm, the migration command, and its source dependencies.
Private data is excluded from the image build context.
Compose binds port 3000 to loopback. Set `APP_PORT_EXPOSE` to change that host port.
Use the configured reverse proxy for public HTTPS access.

The service uses two persistent volumes:

- `comic-book-data` at `/app/data` stores accounts, sessions, books, and images.
- `comic-book-backups` at `/app/backups` stores checked migration backups.

Build the image before stopping the service:

```sh
cd app
docker compose build app
docker compose stop app
```

Run maintenance with the service stopped. Keep enough free space for the full backup.

```sh
docker compose run --rm app pnpm accounts:migrate --data-dir /app/data --dry-run
docker compose run --rm app pnpm accounts:migrate --data-dir /app/data --apply
docker compose run --rm app pnpm accounts:verify --data-dir /app/data
```

For a new empty volume, use this command instead of migration:

```sh
docker compose run --rm app pnpm accounts:init-empty --data-dir /app/data
```

Start only after the chosen setup command passes:

```sh
docker compose up -d app
```

Use HTTPS for a deployed origin. Production session cookies have `Secure`, `HttpOnly`, and `SameSite=Lax` attributes.
The cookie path follows `BASE_PATH`. Do not expose another URL as an alternate write origin.
Confirm the actual proxy and HTTPS path during the separately approved rollout.

## What the migration preserves

Comic JSON stays under `comic-books/`. Images stay under `comic-book-images/`.
The migration adds only `ownerUserId` and `revision: 1` to each raw book.
It does not normalize pages or change existing values, IDs, timestamps, or image references.

Each backup has a `files/` tree and a separate `.manifest.json` file.
The manifest contains file hashes. A source file named `.manifest.json` stays inside `files/`.
Unknown files and inherited project data are included in the backup.

The journal is `migrations/legacy-ownership/journal.json`.
It records source hashes, target hashes, the chosen account, and the backup path.
The command writes `data-state.json` only after the checks pass.
Keep the backup at its recorded absolute path for verification and interrupted recovery.

A matching rerun verifies the original migration result. A different email cannot reassign the library.
Verification is a cutover check before normal app use. Later edits and session files change the snapshot.
After new work exists, the migration command stops on those changes. It does not reset or replace that work.

## Interrupted migration

Keep the app stopped. Rerun apply with the same target, email, and backup mount.
The journal reuses the chosen account and accepts only known source or target file hashes.
A changed or missing file stops the command.

Do not delete the journal or completion marker to force another run.
Restore a stopped rehearsal copy to investigate a failed check.

## Recovery

Before any new app writes, stop the service and preserve the failed target separately.
Restore the backup's `files/` tree into a separate writable directory or volume.
Set owner write permission on restored files; backup files are read-only.
Compare restored files against the backup manifest before starting the previous app image.

Never start old code against migrated data. Never restore a pre-migration backup over newer work.
After new accounts or edits exist, preserve the entire current volume and repair forward.
Keep new accounts, sessions, and books when investigating a problem.

## Release checks

Use a stopped, disposable copy to prove migration, verification, and a matching rerun.
Compare every book value and all image and inherited-file bytes with the checked backup.
Sign in as the legacy owner. Open a book and its crop original, save, and reload.
Create a second account and confirm its library starts empty.
Restart the runtime process and confirm accounts, sessions, and saved books remain available.

Run these code checks from `app/`:

```sh
pnpm type-check
pnpm lint
pnpm exec vitest run src/lib/migrations/legacy-ownership.server.test.ts src/lib/auth/accounts.server.test.ts src/lib/comics/data.server.test.ts src/components/comics/comic-draft-queue.test.ts
pnpm build
```

Keep the live target, initial password entry, proxy check, and cutover approval in the rollout ticket.
Do not store passwords, session cookies, private screenshots, or data backups in Git.
