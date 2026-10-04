# User names and legacy account signup

The app uses one Node process and disk storage. Keep one writer per data directory.
Docker holds a kernel file lock throughout service on the Compose named volumes.

## Settings

| Setting | Use |
| --- | --- |
| `APP_DATA_DIR` | Absolute existing data directory. Compose keeps `/app/data`. |
| `APP_ORIGIN` | Exact browser origin, such as `https://comics.example.com`. |
| `BASE_PATH` | App path. Use the same value during build and startup. |
| `LEGACY_USERNAME` | The first signup with this user name claims the legacy library. |
| `MIGRATION_BACKUP_DIR` | Persistent backup parent outside the data tree. Compose uses `/app/backups`. |

User names use 1–40 letters, numbers, dots, dashes, or underscores.
Start with a letter or number. Comparison trims outer spaces and ignores case.
Stored user names use lowercase. Passwords use 15–128 characters; spaces are allowed.
The website has no password reset or user name change flow.
Use Node 22.6 or later and pnpm 11.9.0.

## Existing installation

1. Set `LEGACY_USERNAME` to the intended owner's user name.
2. Deploy through your normal Docker Compose process.
3. Open Create account and enter that user name and your chosen password.

No migration command, temporary password, or terminal prompt is required.
Byron selected a first matching signup claim rule. Anyone who registers the configured user name first receives the legacy library.
This release does not verify identity or require a separate claim code.

Keep the existing Compose project name and data volume. Stop the old container before starting the new release.
The old release cannot participate in the new writer lock. Never run both against the same data volume.

Startup validates legacy records, image files, crop originals, and any recovery record.
It makes no source changes while waiting for signup. Public account pages remain available.
Private documents remain unavailable. Other accounts cannot register until the legacy account is complete.
Missing configuration, corrupt records, conflicting ownership, or an unexpected empty mount stops startup.

Matching signup runs these steps:

1. Validate the supplied user name and password.
2. Copy the complete data tree into a new private backup directory.
3. Compare every file name and SHA-256 hash, then sync backup files and directories to disk.
4. Record the selected owner and password hash in permanent recovery records.
5. Apply checked ownership changes without changing existing JSON tokens.
6. Verify the result and write the completion marker last.
7. Create the session and open the legacy library.

No plaintext password is written to storage or logs. The account and recovery records contain the scrypt hash.
Backup failure stops signup before any source change. The form shows a setup error; logs describe the failure.
No error causes deletion, source cleanup, or an empty replacement library.

## Docker persistence

The service retains `comic-book-data` at `/app/data`.
The separate `comic-book-backups` volume at `/app/backups` stores backups, recovery records, and the writer lock.
Both volumes survive container replacement. Never remove the backup volume or run `docker compose down -v`.
Keep enough free space for the complete copy. Keep the same backup mount during recovery.
A second container using these named volumes exits with code 73 while the first holds the lock.
Separate host bind mounts on Docker Desktop did not share the lock during rehearsal. Keep the named-volume configuration.

```sh
cd app
docker compose up -d --build app
```

The runtime image includes the startup scripts and their source dependencies.
Private data is excluded from the build context. Compose binds the host port to loopback.
Use the configured reverse proxy and HTTPS origin.
Production session cookies use Secure, HttpOnly, and SameSite=Lax.

## Preservation and restart

Comic JSON stays under `comic-books/`. Images stay under `comic-book-images/`.
Migration appends only `ownerUserId` and `revision: 1` to each raw book.
All existing JSON tokens, IDs, timestamps, image references, unknown files, inherited files, and empty directories stay intact.

Each backup contains a complete `files/` tree and a separate `.manifest.json` with hashes.
A source file named `.manifest.json` remains inside `files/`. Backup files are read-only.
Backups use unique directory names. The app never overwrites or automatically removes them.
The copy protects against migration changes. It cannot protect against destruction of the entire server or disk.

The source journal is `migrations/legacy-ownership/journal.json`.
A permanent `.legacy-HASH.json` recovery record in the backup parent records the same owner, password hash, and backup.
The external record permits recovery if signup stops before the source journal is published.
Migration stages atomic writes inside its own metadata directory.
Each source file must match its recorded source or target hash before retry can proceed.
Corrupt or incomplete recovery records stop progress for investigation. They never select another owner.

After interruption, restart with the same mounts and setting.
Submit Create account again with the same user name and original chosen password.
A different password cannot resume or claim the interrupted migration.
The original backup and owner stay fixed. Keep failed copies and records; do not remove metadata to force another migration.
If signup completed but session creation failed, sign in with your chosen password instead.

After completion, startup checks account identity, book ownership, record validity, and the preserved backup.
It does not compare current data against the old migration snapshot.
Later sessions, registrations, revisions, new books, and inherited edits survive restart.
You can remove `LEGACY_USERNAME` after completion. A different supplied value stops startup without reassigning data.
A later signup with the claimed user name reports a duplicate account; it never replaces the password or ownership.

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
`pnpm start` runs the storage gate. `pnpm dev` requires an explicit target and the configured legacy user name or prepared storage.

## Maintenance and recovery

The optional `accounts:migrate` CLI supports stopped-copy dry runs and hidden password entry.
It is not required for website signup. Use an explicit absolute data path and `LEGACY_USERNAME`.
`accounts:verify` compares the cutover snapshot. Run it before account use changes that snapshot.

Before new app writes, preserve a failed target and restore backup `files/` into separate writable storage.
Compare restored files with the manifest before using the old release.
Never start old code against migrated files. Never restore a pre-migration backup over newer work.
After registrations or edits exist, preserve the current volume and repair forward.

## Checks

Use disposable filesystem data for signup, preservation, interruption, password, restart, and failure checks.
Verify the packaged Docker entrypoint and real signup form. Check correct legacy ownership and second-account isolation.
Live volume mapping, HTTPS, and proxy checks remain release constraints. No production operation was performed.

```sh
pnpm type-check
pnpm lint
pnpm exec vitest run src/lib/migrations/startup.server.test.ts src/lib/migrations/legacy-ownership.server.test.ts src/lib/auth/accounts.server.test.ts src/lib/comics/data.server.test.ts src/components/comics/comic-draft-queue.test.ts
pnpm build
```
