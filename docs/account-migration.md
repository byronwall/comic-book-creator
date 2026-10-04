# Account setup and automatic migration

The app uses one Node process and disk storage. Keep one writer per data directory.
Docker holds a kernel file lock throughout migration and normal service.
Requests never migrate data or assign ownership from an email.

This guide describes release behavior. No live deployment or migration was performed.

## Settings

| Setting | Use |
| --- | --- |
| `APP_DATA_DIR` | Absolute existing data directory. Compose keeps `/app/data`. |
| `APP_ORIGIN` | Exact browser origin, such as `https://comics.example.com`. |
| `BASE_PATH` | App path. Use the same value during build and startup. |
| `LEGACY_USER_EMAIL` | Starts automatic legacy migration when storage lacks a completion marker. |
| `MIGRATION_BACKUP_DIR` | Persistent backup parent outside the data tree. Compose uses `/app/backups`. |

Email comparison trims outer spaces and ignores case. It preserves dots and plus signs.
Passwords use 15–128 characters. The app has no verification email or password reset flow.
Use Node 22.6 or later and pnpm 11.9.0.

## Existing installation

Set `LEGACY_USER_EMAIL` to the intended owner's email before your normal deployment.
Keep the existing Compose project name and data volume. Stop the old container before starting the new release.
The old release cannot participate in the new writer lock. Never run both against the same data volume.

No migration command or terminal prompt is required. The Docker entrypoint runs these steps before opening a port:

1. Obtain the writer lock in the separate backup volume.
2. Validate legacy records, image files, and crop originals.
3. Copy the complete data tree into a new private backup directory.
4. Compare every file name and SHA-256 hash, then sync backup files and directories to disk.
5. Store a private random password and permanent recovery record outside the source tree.
6. Record the selected owner and apply checked ownership changes.
7. Verify the result and write the completion marker last.
8. Validate prepared storage, then start the HTTP server.

Missing email, invalid data, conflicting ownership, or backup failure stops startup.
An empty mount also stops startup. Check the production volume mapping instead of initializing an unexpected empty mount.
No error causes deletion, source cleanup, or an empty replacement library.

## Legacy account password

Automatic migration generates a unique password with 32 random bytes.
It stores the password in `owner-password.txt` within the checked backup directory, with mode `0600`.
The backup directory has mode `0700`. Account storage contains only the scrypt password hash.
Logs report the backup path but never print the password.

After successful startup, read that private file through your server administrator access.
For example, substitute the backup directory reported in the startup log:

```sh
docker compose exec app cat /app/backups/DATA-BACKUP-DIRECTORY/owner-password.txt
```

Store the result in your password manager. Sign in with the legacy email and that password.
Do not share command output or include it in tickets. Knowing the email cannot claim the account.
The website has no password change/reset flow. The generated password is the account's login password.
A resumed migration retains the original password and selected owner.

## Docker persistence

The service retains the existing `comic-book-data` volume at `/app/data`.
The separate `comic-book-backups` volume at `/app/backups` stores backups, recovery records, and the writer lock.
Both volumes survive container replacement. Never remove the backup volume or run `docker compose down -v`.
Use enough free space for the complete copy. Keep the same backup mount during recovery.
A second container using these mounts exits with code 73 while the first holds the lock.

Normal deployment builds and starts the service with these settings:

```sh
cd app
docker compose up -d --build app
```

The runtime image includes the startup scripts and their source dependencies.
Private data is excluded from the build context. Compose binds the host port to loopback.
Use the configured reverse proxy and HTTPS origin. Production session cookies use Secure, HttpOnly, and SameSite=Lax.

## Preservation and restart

Comic JSON stays under `comic-books/`. Images stay under `comic-book-images/`.
Migration adds only `ownerUserId` and `revision: 1` to each raw book.
All other values, IDs, timestamps, image references, unknown files, inherited files, and empty directories stay intact.

Each backup contains a complete `files/` tree and a separate `.manifest.json` with hashes.
A source file named `.manifest.json` remains inside `files/`. Backup files are read-only.
Backups use unique directory names. The app never overwrites or automatically removes them.
The copy protects against migration changes. It cannot protect against destruction of the entire server or disk.

The source journal is `migrations/legacy-ownership/journal.json`.
A permanent `.legacy-HASH.json` recovery record in the backup parent also records the same owner and backup.
The external record permits recovery if startup stops before the source journal is published.
Migration stages atomic writes inside its own metadata directory. Abandoned staged writes do not alter source accounting.
Each source file must match its recorded source or target hash before retry can proceed.
A corrupt or incomplete recovery record stops startup for investigation; it never selects another owner.

Restart the container with the same email and mounts after an interrupted migration.
Keep all failed copies and records. Do not remove metadata to force a new migration.

After completion, startup checks account identity, book ownership, record validity, and the preserved backup.
It does not compare current data against the old migration snapshot.
Later sessions, registrations, revisions, new books, and inherited edits survive normal restart.
You can remove `LEGACY_USER_EMAIL` after completion. A different supplied email stops startup without reassigning data.

## New empty installation

Empty initialization remains explicit. Never use it on an existing or unexpectedly empty production mount.
Run from `app/` before local development:

```sh
pnpm install
export APP_DATA_DIR="$PWD/data"
export APP_ORIGIN=http://localhost:3000
pnpm accounts:init-empty --data-dir "$APP_DATA_DIR"
pnpm dev
```

For a confirmed new Docker volume, run `docker compose run --rm app pnpm accounts:init-empty --data-dir /app/data`.
Then start the service and create an account. New libraries contain no sample books.
`pnpm start` runs the startup gate. `pnpm dev` requires already prepared disposable storage.

## Maintenance and recovery

The optional `accounts:migrate` CLI still supports a stopped-copy dry run and hidden password entry.
It is not part of the automatic deployment path. Use an explicit absolute data path.
`accounts:verify` compares the cutover snapshot. Run it only before normal account use changes that snapshot.

Before new app writes, preserve a failed target and restore backup `files/` into separate writable storage.
Compare all restored files with the manifest before using the old release.
Never start old code against migrated files. Never restore a pre-migration backup over newer work.
After registrations or edits exist, preserve the current volume and repair forward.

## Checks

Use disposable filesystem data for preservation, interruption, credential, restart, and failure checks.
Verify the packaged Docker entrypoint, not just the CLI. Check correct legacy ownership and second-account isolation.
Live volume mapping, HTTPS, and proxy checks remain release constraints. No production operation is authorized here.

```sh
pnpm type-check
pnpm lint
pnpm exec vitest run src/lib/migrations/startup.server.test.ts src/lib/migrations/legacy-ownership.server.test.ts src/lib/auth/accounts.server.test.ts src/lib/comics/data.server.test.ts src/components/comics/comic-draft-queue.test.ts
pnpm build
```
