# Account storage setup

The existing site has completed account migration. Signup creates ordinary accounts.
Startup reads account storage and checks book ownership. It does not read migration journals or verify migration backups.

Set `APP_DATA_DIR` to the existing absolute data path. Set `APP_ORIGIN` to the canonical browser origin.
`LEGACY_USERNAME` and `MIGRATION_BACKUP_DIR` are no longer used.

Keep `auth/users.json`, `auth/sessions/`, `data-state.json`, books, and images in the persistent data directory.
Existing accounts, passwords, sessions, and book ownership need no conversion.

`data-state.json` keeps schema version 2. Its `legacyUserId` field stores the owner of shared project and spatial-map tools.
Keep this field to preserve access control. New accounts cannot access another account's tools or books.
The old `migrationId` and `completedAt` fields are no longer read.

Old migration journals and backups are historical records. The app no longer needs them to start.
Keep backups for recovery. Docker Compose retains the backup volume.
Do not start old code against current data or restore an old backup over newer work.

For a new, empty installation only, run from `app/`:

```sh
export APP_DATA_DIR=/absolute/path/to/new-data
pnpm accounts:init-empty --data-dir "$APP_DATA_DIR"
```

For a new Docker volume, run:

```sh
docker compose run --rm app pnpm accounts:init-empty --data-dir /app/data
```

Then start the site and create an account. Never initialize an existing library.
Unowned data is rejected. The app cannot migrate an old single-user library.
Keep one writer per data directory. The Docker entrypoint locks `.writer.lock` inside the data directory.

## Admin access

Set `ADMIN_USERNAME` to an existing account username, then restart the server.
Username matching ignores case and surrounding spaces. Leave the setting empty to turn off admin access.
The matching user sees an Admin link and can open `/admin`. All admin queries and actions check the server session.

The admin can inspect aggregate library counts and storage, reset passwords, disable or enable accounts, and delete accounts.
Password resets and disabling end existing sessions. The admin supplies and shares the new password; no email is sent.
The current admin cannot disable or delete itself. Deletion removes the account, sessions, owned books, and stored photos.
Deleting the shared tool owner clears its saved access assignment; it does not transfer shared project data.
A failed deletion leaves the account disabled so the admin can inspect and retry.

New account and comic events are appended to `admin/events.jsonl`. Existing activity cannot be reconstructed fully.
Book opens and saves are grouped into five-minute intervals. Events remain after account deletion.
No password, book text, or photo content is recorded in these events.
The admin page shows event-log size and library bytes. Events are retained without automatic pruning.
