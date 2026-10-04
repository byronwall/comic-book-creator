import path from "node:path";
import { readDataState } from "../auth/data-state.server.ts";
import { readUserStore } from "../auth/users.server.ts";
import { inventory, pathExists, readOptionalJson, requireAbsolute, verifyBackup, type MigrationJournal } from "./legacy-ownership-files.ts";
import { inspectLegacyData, migrateLegacyData } from "./legacy-ownership.server.ts";

export async function prepareStartupStorage(input: { dataDir: string; email?: string; backupDir?: string }) {
  requireAbsolute(input.dataDir);
  const root = path.resolve(input.dataDir);
  const email = input.email?.trim().toLowerCase();
  if (!await pathExists(path.join(root, "data-state.json"))) {
    if (!email) throw new Error("Storage is not prepared. Set LEGACY_USER_EMAIL to migrate existing data before startup.");
    if ((await inventory(root)).length === 0) {
      throw new Error("Storage is empty. Check the existing data mount; use accounts:init-empty only for a new installation.");
    }
    const report = await migrateLegacyData({ dataDir: root, email, backupDir: input.backupDir, generatePassword: true });
    console.log(`Legacy migration completed. Preserved backup: ${report.backupDir}`);
    console.log("For an automatically created account, read owner-password.txt in that private backup directory. No password is logged.");
  }

  // This is a startup check, not the cutover snapshot comparison. Normal edits,
  // registrations, and sessions must never cause re-migration or replacement.
  const state = await readDataState(root);
  const store = await readUserStore(root);
  if (state.legacyUserId !== null) {
    const user = store.users.find((item) => item.id === state.legacyUserId);
    const journal = await readOptionalJson(path.join(root, "migrations/legacy-ownership/journal.json")) as MigrationJournal | null;
    if (!user || !journal || journal.schemaVersion !== 1 || journal.migrationId !== state.migrationId
      || journal.user.id !== user.id || journal.email !== user.email || (email && email !== user.email)) {
      throw new Error("Completed migration owner or journal does not match. Refusing to reassign or replace data.");
    }
    await verifyBackup(journal);
  } else if (state.migrationId !== "empty-init"
    || await pathExists(path.join(root, "migrations/legacy-ownership"))) {
    throw new Error("Storage completion state conflicts with legacy migration.");
  }
  const inspected = await inspectLegacyData(root, true);
  const users = new Set(store.users.map((user) => user.id));
  for (const { relative, book } of inspected.records) {
    if (typeof book.ownerUserId !== "string" || !users.has(book.ownerUserId)) {
      throw new Error(`Book has an unknown owner: ${relative}`);
    }
  }
  return state;
}
