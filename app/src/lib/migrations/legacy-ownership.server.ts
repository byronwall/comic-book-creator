import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, open, readFile } from "node:fs/promises";
import { hashPassword, verifyPassword } from "../auth/password.server.ts";
import { replaceUserStore, readUserStore, validUsername } from "../auth/users.server.ts";
import type { DataState, User, UserStore } from "../auth/types.ts";
import { writeFileAtomic } from "../server/atomic-file.ts";
import { writeMigrationFile } from "./migration-write.ts";
import { backupLocation, checkHashes, compareMigrated, createBackup, inventory, pathExists, readOptionalJson, recoveryPath, requireAbsolute, sha256, syncPath, validateImages, verifyBackup, type MigrationJournal } from "./legacy-ownership-files.ts";

export interface MigrationReport {
  dataDir: string;
  username: string;
  files: number;
  books: number;
  backupDir?: string;
  resumed: boolean;
  completed: boolean;
}

export async function inspectLegacyData(dataDir: string, prepared = false) {
  requireAbsolute(dataDir);
  const root = path.resolve(dataDir);
  const files = await inventory(root);
  const bookFiles = files.filter((file) => file.startsWith("comic-books/") && file.endsWith(".json"));
  const ids = new Set<string>();
  const records: Array<{ relative: string; raw: string; book: Record<string, unknown> }> = [];
  for (const relative of bookFiles) {
    const raw = await readFile(path.join(root, relative), "utf8");
    let value: unknown;
    try { value = JSON.parse(raw); } catch { throw new Error(`Malformed JSON: ${relative}`); }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid book record: ${relative}`);
    const book = value as Record<string, unknown>;
    const id = book.id;
    const filenameId = path.basename(relative, ".json");
    if (typeof id !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(id) || id !== filenameId) throw new Error(`Invalid book ID or filename: ${relative}`);
    if (typeof book.title !== "string" || typeof book.updatedAt !== "string") throw new Error(`Missing book title or timestamp: ${relative}`);
    if (ids.has(id)) throw new Error(`Duplicate book ID: ${id}`);
    ids.add(id);
    if (book.ownerUserId !== undefined && (typeof book.ownerUserId !== "string" || !book.ownerUserId)) {
      throw new Error(`Invalid book owner: ${relative}`);
    }
    if (book.ownerUserId !== undefined && (prepared
      ? !Number.isSafeInteger(book.revision) || Number(book.revision) < 1
      : book.revision !== 1)) throw new Error(`Invalid existing book revision: ${relative}`);
    if (!Array.isArray(book.pages) || book.pages.length === 0) throw new Error(`Book pages are invalid: ${relative}`);
    const pageIds = new Set<string>();
    for (const pageValue of book.pages) {
      if (!pageValue || typeof pageValue !== "object" || Array.isArray(pageValue)) throw new Error(`Invalid page in ${relative}`);
      const page = pageValue as Record<string, unknown>;
      if (typeof page.id !== "string" || !page.id || pageIds.has(page.id)) throw new Error(`Invalid or duplicate page ID in ${relative}`);
      pageIds.add(page.id);
      if (!Array.isArray(page.texts) || !page.texts.every((text) => text && typeof text === "object" && !Array.isArray(text))) throw new Error(`Invalid page text list in ${relative}`);
      if (page.images !== undefined && !Array.isArray(page.images)) throw new Error(`Invalid image list in ${relative}`);
    }
    await validateImages(root, id, book.pages, relative);
    records.push({ relative, raw, book });
  }
  return { root, files, records };
}

export async function preflightLegacyData(dataDir: string, usernameInput: string, backupDir?: string) {
  const username = normalizeUsername(usernameInput);
  if (!validUsername(username)) throw new Error("LEGACY_USERNAME must use 1–40 letters, numbers, dots, dashes, or underscores.");
  const inspected = await inspectLegacyData(dataDir);
  const { root, files, records } = inspected;
  await backupLocation(root, backupDir);
  if (records.length === 0 && files.length === 0) throw new Error("Use explicit empty initialization for an empty data directory.");
  const statePath = path.join(root, "data-state.json");
  const journalPath = path.join(root, "migrations", "legacy-ownership", "journal.json");
  const completedValue = await readOptionalJson(statePath);
  if (completedValue) {
    const state = completedValue as DataState;
    const store = await readUserStore(root);
    const user = store.users.find((item) => item.id === state.legacyUserId);
    if (state.schemaVersion !== 2 || !user || user.username !== username) throw new Error("Completed migration belongs to a different username or has invalid state.");
    await verifyCompleted(root, files, records, state, user);
    return { inspected, username, journal: null, completed: true };
  }
  const journal = (await readOptionalJson(journalPath)
    ?? await readOptionalJson(await recoveryPath(root, backupDir))) as MigrationJournal | null;
  if (journal) {
    if (journal.schemaVersion !== 1 || journal.username !== username) throw new Error("Migration journal username does not match LEGACY_USERNAME.");
    await checkHashes(root, journal, files);
    checkRecordOwners(records, journal.user.id);
    await verifyBackup(journal);
    return { inspected, username, journal, completed: false };
  }
  if (await pathExists(statePath)) throw new Error("Data state exists without a completed migration journal.");
  if (await pathExists(path.join(root, "migrations", "legacy-ownership"))) {
    throw new Error("Migration directory exists without a journal. Preserve it and investigate before startup.");
  }
  if (records.some(({ book }) => book.ownerUserId !== undefined || book.revision !== undefined)) {
    throw new Error("Legacy books must not have an owner or revision before migration.");
  }
  if (files.some((file) => file.startsWith("auth/"))) throw new Error("Account data exists without a migration journal.");
  return { inspected, username, journal: null, completed: false };
}

export async function migrateLegacyData(input: {
  dataDir: string; username: string; password?: string; backupDir?: string; interruptAfterBooks?: number;
}): Promise<MigrationReport> {
  const preflight = await preflightLegacyData(input.dataDir, input.username, input.backupDir);
  const { root, files, records } = preflight.inspected;
  const { username } = preflight;
  if (preflight.completed) {
    return { dataDir: root, username, files: files.length, books: records.length, resumed: false, completed: true };
  }
  let journal = preflight.journal;
  if (journal && input.password && !await verifyPassword(input.password, journal.user.passwordHash)) {
    throw new Error("Use the original account password to resume this migration.");
  }
  const resumed = Boolean(journal);
  if (!journal) {
    const password = input.password;
    if (!password) throw new Error("An initial password is required.");
    const user: User = {
      id: randomUUID(), username, passwordHash: await hashPassword(password), createdAt: new Date().toISOString(),
    };
    const backupDir = await createBackup(root, files, input.backupDir);
    const source = await readOptionalJson(path.join(backupDir, ".manifest.json")) as Record<string, string>;
    for (const record of records) {
      if (source[record.relative] !== sha256(record.raw)) throw new Error(`Book changed before backup: ${record.relative}`);
    }
    const targets: Record<string, string> = {};
    for (const record of records) {
      targets[record.relative] = sha256(addOwnership(record.raw, user.id));
    }
    targets["auth/users.json"] = sha256(`${JSON.stringify({ schemaVersion: 1, users: [user] }, null, 2)}\n`);
    journal = {
      schemaVersion: 1, migrationId: randomUUID(), username, user, backupDir,
      source,
      targets, bookIds: records.map(({ book }) => String(book.id)),
    };
    // Persist the chosen owner outside the source before creating any source
    // metadata. Never replace this recovery record, even on retry.
    const recovery = await recoveryPath(root, input.backupDir);
    const handle = await open(recovery, "wx", 0o600);
    try {
      await handle.writeFile(`${JSON.stringify(journal, null, 2)}\n`);
      await handle.sync();
    } finally { await handle.close(); }
    await syncPath(path.dirname(recovery));
  }

  if (!await pathExists(path.join(root, "migrations/legacy-ownership/journal.json"))) {
    await verifyBackup(journal);
    await checkHashes(root, journal, files);
    await writeMigrationFile(root, "migrations/legacy-ownership/journal.json", `${JSON.stringify(journal, null, 2)}\n`);
  }
  await checkHashes(root, journal, files);
  let committed = 0;
  for (const { relative, raw } of records) {
    const target = journal.targets[relative];
    const currentHash = sha256(await readFile(path.join(root, relative)));
    if (currentHash !== target) {
      const next = addOwnership(raw, journal.user.id);
      if (sha256(next) !== target) throw new Error(`Migration target changed: ${relative}`);
      await writeMigrationFile(root, relative, next);
    }
    committed += 1;
    if (input.interruptAfterBooks === committed) throw new Error(`Simulated interruption after ${committed} book(s).`);
  }
  const userStore: UserStore = { schemaVersion: 1, users: [journal.user] };
  const registryPath = path.join(root, "auth", "users.json");
  const currentRegistry = await readOptionalJson(registryPath);
  if (currentRegistry && sha256(await readFile(registryPath)) !== journal.targets["auth/users.json"]) {
    throw new Error("Account registry changed during migration.");
  }
  if (!currentRegistry) await writeMigrationFile(root, "auth/users.json", `${JSON.stringify(userStore, null, 2)}\n`);
  await compareMigrated(root, files, records, journal);
  const state: DataState = {
    schemaVersion: 2, legacyUserId: journal.user.id, migrationId: journal.migrationId, completedAt: new Date().toISOString(),
  };
  await writeMigrationFile(root, "data-state.json", `${JSON.stringify(state, null, 2)}\n`);
  return { dataDir: root, username, files: files.length, books: records.length, backupDir: journal.backupDir, resumed, completed: true };
}

export async function initializeEmptyData(dataDir: string): Promise<DataState> {
  requireAbsolute(dataDir);
  const root = path.resolve(dataDir);
  await mkdir(root, { recursive: true });
  if (await pathExists(path.join(root, "data-state.json"))) throw new Error("Data state already exists; empty initialization cannot replace it.");
  const files = await inventory(root);
  const registryPath = path.join(root, "auth", "users.json");
  if (files.length > 0) {
    if (files.length !== 1 || files[0] !== "auth/users.json") throw new Error("Empty initialization requires an empty data directory.");
    const existing = await readOptionalJson(registryPath) as UserStore | null;
    if (!existing || existing.schemaVersion !== 1 || !Array.isArray(existing.users) || existing.users.length !== 0) {
      throw new Error("Empty initialization found account data and stopped.");
    }
  }
  const state: DataState = { schemaVersion: 2, legacyUserId: null, migrationId: "empty-init", completedAt: new Date().toISOString() };
  await replaceUserStore({ schemaVersion: 1, users: [] }, root);
  await writeFileAtomic(path.join(root, "data-state.json"), `${JSON.stringify(state, null, 2)}\n`);
  return state;
}

export async function verifyData(dataDir: string, username: string) {
  const report = await inspectLegacyData(dataDir);
  const state = await readOptionalJson(path.join(report.root, "data-state.json")) as DataState | null;
  if (!state || state.schemaVersion !== 2) throw new Error("Migration is incomplete.");
  const store = await readUserStore(report.root);
  const user = store.users.find((entry) => entry.id === state.legacyUserId);
  if (state.legacyUserId && (!user || user.username !== normalizeUsername(username))) throw new Error("Legacy account does not match LEGACY_USERNAME.");
  for (const { book } of report.records) {
    if (book.ownerUserId !== state.legacyUserId || book.revision !== 1) throw new Error(`Book is not migrated: ${book.id}`);
  }
  if (state.legacyUserId) {
    const journal = await readOptionalJson(path.join(report.root, "migrations", "legacy-ownership", "journal.json")) as MigrationJournal | null;
    if (!journal || !user) throw new Error("Migration journal is missing.");
    await checkHashes(report.root, journal, report.files);
    await compareMigrated(report.root, report.files, report.records, journal);
    await verifyBackup(journal);
  } else if (report.records.length > 0) throw new Error("Empty data state contains books.");
  return { dataDir: report.root, files: report.files.length, books: report.records.length, username: user?.username ?? null, completed: true };
}

function checkRecordOwners(records: Array<{relative:string;book:Record<string,unknown>}>, userId: string) {
  for (const { relative, book } of records) {
    if (book.ownerUserId !== undefined && (book.ownerUserId !== userId || book.revision !== 1)) {
      throw new Error(`Book has a conflicting owner or revision: ${relative}`);
    }
  }
}

function normalizeUsername(username: string) { return username.trim().toLowerCase(); }
function addOwnership(raw: string, userId: string) {
  // Preserve original JSON tokens too: parsing and reserializing can change
  // unknown numbers, duplicate keys, or formatting in inherited records.
  const end = raw.lastIndexOf("}");
  return `${raw.slice(0, end)},\n  "ownerUserId": ${JSON.stringify(userId)},\n  "revision": 1\n${raw.slice(end)}`;
}
async function verifyCompleted(root: string, files: string[], records: Array<{relative:string;book:Record<string,unknown>}>, state: DataState, user: User) {
  const journal = await readOptionalJson(path.join(root, "migrations", "legacy-ownership", "journal.json")) as MigrationJournal | null;
  if (!journal || journal.migrationId !== state.migrationId || journal.user.id !== user.id) throw new Error("Completed migration journal is missing or inconsistent.");
  await checkHashes(root, journal, files);
  checkRecordOwners(records, journal.user.id);
  await compareMigrated(root, files, records, journal);
  await verifyBackup(journal);
}
