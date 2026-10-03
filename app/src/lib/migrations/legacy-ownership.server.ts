import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { hashPassword } from "../auth/password.server.ts";
import { replaceUserStore, readUserStore } from "../auth/users.server.ts";
import type { DataState, User, UserStore } from "../auth/types.ts";
import { writeFileAtomic } from "../server/atomic-file.ts";
import { checkHashes, compareMigrated, createBackup, inventory, pathExists, readOptionalJson, requireAbsolute, sha256, validateImages, verifyBackup, type MigrationJournal } from "./legacy-ownership-files.ts";

export interface MigrationReport {
  dataDir: string;
  email: string;
  files: number;
  books: number;
  backupDir?: string;
  resumed: boolean;
  completed: boolean;
}

export async function inspectLegacyData(dataDir: string) {
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
    if (typeof id !== "string" || !id || id !== filenameId) throw new Error(`Book ID does not match filename: ${relative}`);
    if (ids.has(id)) throw new Error(`Duplicate book ID: ${id}`);
    ids.add(id);
    if (book.ownerUserId !== undefined && (typeof book.ownerUserId !== "string" || !book.ownerUserId)) {
      throw new Error(`Invalid book owner: ${relative}`);
    }
    if (book.ownerUserId !== undefined && book.revision !== 1) throw new Error(`Invalid existing book revision: ${relative}`);
    if (!Array.isArray(book.pages)) throw new Error(`Book pages are invalid: ${relative}`);
    const pageIds = new Set<string>();
    for (const pageValue of book.pages) {
      if (!pageValue || typeof pageValue !== "object" || Array.isArray(pageValue)) throw new Error(`Invalid page in ${relative}`);
      const page = pageValue as Record<string, unknown>;
      if (typeof page.id !== "string" || !page.id || pageIds.has(page.id)) throw new Error(`Invalid or duplicate page ID in ${relative}`);
      pageIds.add(page.id);
      if (page.texts !== undefined && !Array.isArray(page.texts)) throw new Error(`Invalid page text list in ${relative}`);
      if (page.images !== undefined && !Array.isArray(page.images)) throw new Error(`Invalid image list in ${relative}`);
    }
    await validateImages(root, id, book.pages, relative);
    records.push({ relative, raw, book });
  }
  return { root, files, records };
}

export async function preflightLegacyData(dataDir: string, emailInput: string) {
  const email = normalizeEmail(emailInput);
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) throw new Error("LEGACY_USER_EMAIL must be a valid email address.");
  const inspected = await inspectLegacyData(dataDir);
  const { root, files, records } = inspected;
  if (records.length === 0 && files.length === 0) throw new Error("Use explicit empty initialization for an empty data directory.");
  const statePath = path.join(root, "data-state.json");
  const journalPath = path.join(root, "migrations", "legacy-ownership", "journal.json");
  const completedValue = await readOptionalJson(statePath);
  if (completedValue) {
    const state = completedValue as DataState;
    const store = await readUserStore(root);
    const user = store.users.find((item) => item.id === state.legacyUserId);
    if (state.schemaVersion !== 2 || !user || user.email !== email) throw new Error("Completed migration belongs to a different email or has invalid state.");
    await verifyCompleted(root, files, records, state, user);
    return { inspected, email, journal: null, completed: true };
  }
  const journal = await readOptionalJson(journalPath) as MigrationJournal | null;
  if (journal) {
    if (journal.schemaVersion !== 1 || journal.email !== email) throw new Error("Migration journal email does not match LEGACY_USER_EMAIL.");
    await checkHashes(root, journal, files);
    checkRecordOwners(records, journal.user.id);
    await verifyBackup(journal);
    return { inspected, email, journal, completed: false };
  }
  if (await pathExists(statePath)) throw new Error("Data state exists without a completed migration journal.");
  if (records.some(({ book }) => book.ownerUserId !== undefined || book.revision !== undefined)) {
    throw new Error("Legacy books must not have an owner or revision before migration.");
  }
  if (files.some((file) => file.startsWith("auth/"))) throw new Error("Account data exists without a migration journal.");
  return { inspected, email, journal: null, completed: false };
}

export async function migrateLegacyData(input: {
  dataDir: string; email: string; password?: string; interruptAfterBooks?: number;
}): Promise<MigrationReport> {
  const preflight = await preflightLegacyData(input.dataDir, input.email);
  const { root, files, records } = preflight.inspected;
  const { email } = preflight;
  if (preflight.completed) {
    return { dataDir: root, email, files: files.length, books: records.length, resumed: false, completed: true };
  }
  let journal = preflight.journal;
  const resumed = Boolean(journal);
  if (!journal) {
    if (!input.password) throw new Error("An initial password is required.");
    const user: User = {
      id: randomUUID(), email, passwordHash: await hashPassword(input.password), createdAt: new Date().toISOString(),
    };
    const backupDir = await createBackup(root, files);
    const targets: Record<string, string> = {};
    for (const record of records) {
      const next = { ...record.book, ownerUserId: user.id, revision: 1 };
      targets[record.relative] = sha256(`${JSON.stringify(next, null, 2)}\n`);
    }
    targets["auth/users.json"] = sha256(`${JSON.stringify({ schemaVersion: 1, users: [user] }, null, 2)}\n`);
    journal = {
      schemaVersion: 1, migrationId: randomUUID(), email, user, backupDir,
      source: Object.fromEntries(await Promise.all(files.map(async (file) => [file, sha256(await readFile(path.join(root, file)))]))),
      targets, bookIds: records.map(({ book }) => String(book.id)),
    };
    await writeFileAtomic(path.join(root, "migrations", "legacy-ownership", "journal.json"), `${JSON.stringify(journal, null, 2)}\n`);
  }

  await checkHashes(root, journal, files);
  let committed = 0;
  for (const { relative, book } of records) {
    const target = journal.targets[relative];
    const currentHash = sha256(await readFile(path.join(root, relative)));
    if (currentHash !== target) {
      const next = { ...book, ownerUserId: journal.user.id, revision: 1 };
      await writeFileAtomic(path.join(root, relative), `${JSON.stringify(next, null, 2)}\n`);
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
  if (!currentRegistry) await replaceUserStore(userStore, root);
  await compareMigrated(root, files, records, journal);
  const state: DataState = {
    schemaVersion: 2, legacyUserId: journal.user.id, migrationId: journal.migrationId, completedAt: new Date().toISOString(),
  };
  await writeFileAtomic(path.join(root, "data-state.json"), `${JSON.stringify(state, null, 2)}\n`);
  return { dataDir: root, email, files: files.length, books: records.length, backupDir: journal.backupDir, resumed, completed: true };
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

export async function verifyData(dataDir: string, email: string) {
  const report = await inspectLegacyData(dataDir);
  const state = await readOptionalJson(path.join(report.root, "data-state.json")) as DataState | null;
  if (!state || state.schemaVersion !== 2) throw new Error("Migration is incomplete.");
  const store = await readUserStore(report.root);
  const user = store.users.find((entry) => entry.id === state.legacyUserId);
  if (state.legacyUserId && (!user || user.email !== normalizeEmail(email))) throw new Error("Legacy account does not match LEGACY_USER_EMAIL.");
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
  return { dataDir: report.root, files: report.files.length, books: report.records.length, email: user?.email ?? null, completed: true };
}

function checkRecordOwners(records: Array<{relative:string;book:Record<string,unknown>}>, userId: string) {
  for (const { relative, book } of records) {
    if (book.ownerUserId !== undefined && (book.ownerUserId !== userId || book.revision !== 1)) {
      throw new Error(`Book has a conflicting owner or revision: ${relative}`);
    }
  }
}

function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
async function verifyCompleted(root: string, files: string[], records: Array<{relative:string;book:Record<string,unknown>}>, state: DataState, user: User) {
  const journal = await readOptionalJson(path.join(root, "migrations", "legacy-ownership", "journal.json")) as MigrationJournal | null;
  if (!journal || journal.migrationId !== state.migrationId || journal.user.id !== user.id) throw new Error("Completed migration journal is missing or inconsistent.");
  await checkHashes(root, journal, files);
  checkRecordOwners(records, journal.user.id);
  await compareMigrated(root, files, records, journal);
  await verifyBackup(journal);
}

