import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { addUser, readUserStore } from "../auth/users.server.ts";
import { verifyPassword } from "../auth/password.server.ts";
import { issueSession, readSession } from "../auth/sessions.server";
import { inventory, sha256, type MigrationJournal } from "./legacy-ownership-files.ts";
import { migrateLegacyData } from "./legacy-ownership.server.ts";
import { registerAccount } from "../auth/register.server";
import { prepareStartupStorage } from "./startup.server.ts";

const password = "a chosen legacy passphrase";
const originalEnv = { APP_DATA_DIR: process.env.APP_DATA_DIR, LEGACY_USERNAME: process.env.LEGACY_USERNAME, MIGRATION_BACKUP_DIR: process.env.MIGRATION_BACKUP_DIR };
const roots: string[] = [];
afterEach(async () => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const base = await mkdtemp(path.join(os.tmpdir(), "comic-startup-"));
  roots.push(base);
  const dataDir = path.join(base, "data");
  const backupDir = path.join(base, "backups");
  await mkdir(path.join(dataDir, "comic-books"), { recursive: true });
  await mkdir(path.join(dataDir, "comic-book-images", "old"), { recursive: true });
  await mkdir(path.join(dataDir, "projects", "empty"), { recursive: true });
  const book = {
    id: "old", title: " Keep all values ", updatedAt: "2025-01-01", extension: { keep: [null, 3] },
    pages: [{ id: "p1", texts: [], images: [{ id: "i1", filename: "crop.png", crop: { sourceFilename: "source.jpg", unknown: true } }] }],
  };
  await writeFile(path.join(dataDir, "comic-books", "old.json"), JSON.stringify(book));
  await writeFile(path.join(dataDir, "comic-book-images", "old", "crop.png"), Buffer.from([0, 255, 2]));
  await writeFile(path.join(dataDir, "comic-book-images", "old", "source.jpg"), Buffer.from([255, 0, 3]));
  await writeFile(path.join(dataDir, "projects", "unknown.bin"), Buffer.from([0, 128, 250]));
  await writeFile(path.join(dataDir, ".manifest.json"), "unknown source metadata");
  process.env.APP_DATA_DIR = dataDir;
  process.env.MIGRATION_BACKUP_DIR = backupDir;
  process.env.LEGACY_USERNAME = "legacy";
  return { dataDir, backupDir, username: "legacy", book };
}

async function hashes(root: string) {
  const files = await inventory(root, true);
  return Object.fromEntries(await Promise.all(files.map(async (file) => [file, sha256(await readFile(path.join(root, file)))])));
}
async function journal(root: string): Promise<MigrationJournal> {
  return JSON.parse(await readFile(path.join(root, "migrations/legacy-ownership/journal.json"), "utf8"));
}

describe("signup-triggered legacy migration", () => {
  it("copies every file and empty directory before ownership changes, with the chosen signup password", async () => {
    const input = await fixture();
    const raw = (await readFile(path.join(input.dataDir, "comic-books/old.json"), "utf8"))
      .replace('"extension":', '"large":90071992547409931234567890,"extension":');
    await writeFile(path.join(input.dataDir, "comic-books/old.json"), raw);
    const before = await hashes(input.dataDir);
    expect(await prepareStartupStorage(input)).toBeNull();
    expect(await hashes(input.dataDir)).toEqual(before);
    await expect(registerAccount("another-user", password)).rejects.toMatchObject({ status: 503 });
    expect(await hashes(input.dataDir)).toEqual(before);
    await registerAccount(" LEGACY ", password);
    const state = (await prepareStartupStorage(input))!;
    const saved = await journal(input.dataDir);
    expect(await hashes(path.join(saved.backupDir, "files"))).toEqual(before);
    expect(saved.source).toEqual(before);
    expect((await stat(path.join(saved.backupDir, "files/projects/empty"))).isDirectory()).toBe(true);
    const { ownerUserId, revision, ...values } = JSON.parse(await readFile(path.join(input.dataDir, "comic-books/old.json"), "utf8"));
    expect(values).toEqual(JSON.parse(raw));
    expect(await readFile(path.join(input.dataDir, "comic-books/old.json"), "utf8")).toContain('"large":90071992547409931234567890');
    expect(ownerUserId).toBe(state.legacyUserId);
    expect(revision).toBe(1);
    await expect(readFile(path.join(saved.backupDir, "owner-password.txt"))).rejects.toMatchObject({ code: "ENOENT" });
    expect(await verifyPassword(password, saved.user.passwordHash)).toBe(true);
    for (const [file, hash] of Object.entries(before)) {
      if (!file.startsWith("comic-books/")) expect(sha256(await readFile(path.join(input.dataDir, file)))).toBe(hash);
    }
  });

  it("fails before source writes on missing username, bad backup location, and malformed records", async () => {
    const input = await fixture();
    const before = await hashes(input.dataDir);
    await expect(prepareStartupStorage({ ...input, username: undefined })).rejects.toThrow(/Set LEGACY_USERNAME/);
    await writeFile(input.backupDir, "not a directory");
    await expect(registerAccount(input.username, password)).rejects.toMatchObject({ status: 503 });
    expect(await hashes(input.dataDir)).toEqual(before);
    await expect(prepareStartupStorage({ ...input, backupDir: path.join(input.dataDir, "backups") })).rejects.toThrow(/outside/);
    expect(await hashes(input.dataDir)).toEqual(before);
    await writeFile(path.join(input.dataDir, "comic-books/old.json"), "{");
    const malformed = await hashes(input.dataDir);
    await expect(prepareStartupStorage(input)).rejects.toThrow(/Malformed JSON/);
    expect(await hashes(input.dataDir)).toEqual(malformed);
  });

  it("resumes checked commits and abandoned staged writes using the original backup and owner", async () => {
    const input = await fixture();
    await expect(migrateLegacyData({ ...input, password, interruptAfterBooks: 1 })).rejects.toThrow(/interruption/);
    const first = await journal(input.dataDir);
    const backupBefore = await hashes(path.join(first.backupDir, "files"));

    await writeFile(path.join(input.dataDir, "migrations/legacy-ownership/stage/next.123.tmp"), "partial staged write");
    // Rehearse an interrupted source journal publication. The external recovery
    // record must retain the original account and backup.
    await rm(path.join(input.dataDir, "migrations/legacy-ownership/journal.json"));
    await expect(prepareStartupStorage({ ...input, username: "wrong" })).rejects.toThrow(/username does not match/);
    expect(await prepareStartupStorage(input)).toBeNull();
    const beforeRetry = await hashes(input.dataDir);
    await expect(registerAccount(input.username, "an incorrect password here")).rejects.toMatchObject({ status: 503 });
    expect(await hashes(input.dataDir)).toEqual(beforeRetry);
    await registerAccount(input.username, password);
    const next = await journal(input.dataDir);
    expect(next).toEqual(first);
    expect(await hashes(path.join(first.backupDir, "files"))).toEqual(backupBefore);

    expect((await readdir(input.backupDir)).filter((name) => name.includes(".backup-")).length).toBe(1);
    expect((await readUserStore(input.dataDir)).users[0].id).toBe(first.user.id);
  });

  it("starts repeatedly after registrations, sessions, and edits without replacing or re-migrating data", async () => {
    const input = await fixture();
    await registerAccount(input.username, password);
    const first = await journal(input.dataDir);
    await addUser({ username: "new", passwordHash: first.user.passwordHash }, input.dataDir);
    const oldDir = process.env.APP_DATA_DIR;
    process.env.APP_DATA_DIR = input.dataDir;
    try {
      const { token } = await issueSession(first.user.id, new Request("http://comic.test"));
      await prepareStartupStorage(input);
      expect((await readSession(new Request("http://comic.test", { headers: { cookie: `comic_session=${token}` } })))?.account.id).toBe(first.user.id);
    } finally {
      if (oldDir === undefined) delete process.env.APP_DATA_DIR; else process.env.APP_DATA_DIR = oldDir;
    }
    await writeFile(path.join(input.dataDir, "comic-books/old.json"), JSON.stringify({ ...input.book, title: "Edited later", ownerUserId: first.user.id, revision: 4 }));
    await writeFile(path.join(input.dataDir, "projects/unknown.bin"), "later inherited work");
    const beforeRestart = await hashes(input.dataDir);
    await prepareStartupStorage(input);
    await prepareStartupStorage({ ...input, username: undefined });
    expect(await hashes(input.dataDir)).toEqual(beforeRestart);
    expect(await journal(input.dataDir)).toEqual(first);
    expect((await readdir(input.backupDir)).filter((name) => name.includes(".backup-")).length).toBe(1);
    await expect(prepareStartupStorage({ ...input, username: "wrong" })).rejects.toThrow(/owner or journal/);
    expect(await hashes(input.dataDir)).toEqual(beforeRestart);
  });

  it("stops on damaged backup bytes and refuses to initialize an empty mount", async () => {
    const input = await fixture();
    await registerAccount(input.username, password);
    const saved = await journal(input.dataDir);
    await rm(path.join(saved.backupDir, "files/projects/unknown.bin"));
    const before = await hashes(input.dataDir);
    await expect(prepareStartupStorage(input)).rejects.toThrow(/accounting/);
    expect(await hashes(input.dataDir)).toEqual(before);
    const empty = path.join(path.dirname(input.dataDir), "empty");
    await mkdir(empty);
    await expect(prepareStartupStorage({ ...input, dataDir: empty })).rejects.toThrow(/Storage is empty/);
    expect(await readdir(empty)).toEqual([]);
  });
});
