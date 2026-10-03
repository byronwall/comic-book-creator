import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readDataState } from "../auth/data-state.server";
import { hashPassword, verifyPassword } from "../auth/password.server.ts";
import { initializeEmptyData, migrateLegacyData, preflightLegacyData, verifyData } from "./legacy-ownership.server.ts";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map(async (root) => {
    try {
      const journal = JSON.parse(await readFile(path.join(root, "migrations", "legacy-ownership", "journal.json"), "utf8"));
      await rm(journal.backupDir, { recursive: true, force: true });
    } catch {}
    await rm(root, { recursive: true, force: true });
  }));
});

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), "comic-migration-"));
  roots.push(root);
  const imageDir = path.join(root, "comic-book-images", "book-1");
  await mkdir(imageDir, { recursive: true });
  await writeFile(path.join(imageDir, "edited.png"), Buffer.from([0, 1, 2, 255]));
  await writeFile(path.join(imageDir, "original.jpg"), Buffer.from([10, 20, 30]));
  await mkdir(path.join(root, "projects", "aux"), { recursive: true });
  await writeFile(path.join(root, "projects", "aux", "keep.bin"), Buffer.from([8, 0, 9]));
  const book = {
    id: "book-1", title: "  Keep spaces  ", updatedAt: "2025-01-01T00:00:00.000Z",
    pages: [{ id: "p1", title: "Page", texts: [], image: { filename: "edited.png", crop: { sourceFilename: "original.jpg", corners: [{ x: 1, y: 2 }] } } }],
    extra: { nested: ["x", 2] },
  };
  await mkdir(path.join(root, "comic-books"), { recursive: true });
  await writeFile(path.join(root, "comic-books", "book-1.json"), `${JSON.stringify(book, null, 2)}\n`);
  await writeFile(path.join(root, "unknown.dat"), "kept");
  await writeFile(path.join(root, ".manifest.json"), "source metadata");
  return { root, book };
}

const password = "an example passphrase";

describe("legacy ownership migration", () => {
  it("preserves raw books, images, auxiliary bytes, and supports a matching rerun", async () => {
    const { root, book } = await fixture();
    const imageBefore = await readFile(path.join(root, "comic-book-images", "book-1", "original.jpg"));
    const auxBefore = await readFile(path.join(root, "projects", "aux", "keep.bin"));
    const first = await migrateLegacyData({ dataDir: root, email: " Legacy@Example.com ", password });
    expect(first.completed).toBe(true);
    const current = JSON.parse(await readFile(path.join(root, "comic-books", "book-1.json"), "utf8"));
    const { ownerUserId, revision, ...content } = current;
    expect(content).toEqual(book);
    expect(ownerUserId).toBeTruthy();
    expect(revision).toBe(1);
    expect(await readFile(path.join(root, "comic-book-images", "book-1", "original.jpg"))).toEqual(imageBefore);
    expect(await readFile(path.join(root, "projects", "aux", "keep.bin"))).toEqual(auxBefore);
    expect(await readFile(path.join(root, ".manifest.json"), "utf8")).toBe("source metadata");
    expect((await readdir(path.dirname(root))).some((name) => name.startsWith(`${path.basename(root)}.backup-`))).toBe(true);
    expect((await migrateLegacyData({ dataDir: root, email: "legacy@example.com" })).resumed).toBe(false);
    await expect(migrateLegacyData({ dataDir: root, email: "other@example.com" })).rejects.toThrow(/different email/);
    expect((await verifyData(root, "legacy@example.com")).books).toBe(1);
    expect((await readDataState(root)).legacyUserId).toBe(ownerUserId);
  });

  it("resumes after one book commit with the journal account", async () => {
    const { root } = await fixture();
    await mkdir(path.join(root, "comic-books"), { recursive: true });
    const second = { id: "book-2", title: "Second", updatedAt: "2025-01-02", pages: [{ id: "p2", texts: [] }] };
    await writeFile(path.join(root, "comic-books", "book-2.json"), `${JSON.stringify(second)}\n`);
    await expect(migrateLegacyData({ dataDir: root, email: "legacy@example.com", password, interruptAfterBooks: 1 })).rejects.toThrow(/Simulated interruption/);
    const userId = JSON.parse(await readFile(path.join(root, "comic-books", "book-1.json"), "utf8")).ownerUserId;
    const resumed = await migrateLegacyData({ dataDir: root, email: "legacy@example.com" });
    expect(resumed.resumed).toBe(true);
    expect(JSON.parse(await readFile(path.join(root, "comic-books", "book-2.json"), "utf8")).ownerUserId).toBe(userId);
  });

  it("stops on malformed books, missing crop sources, existing owners, and changed files", async () => {
    const malformed = await fixture();
    await writeFile(path.join(malformed.root, "comic-books", "book-1.json"), "{");
    await expect(migrateLegacyData({ dataDir: malformed.root, email: "legacy@example.com", password })).rejects.toThrow(/Malformed JSON/);

    const missing = await fixture();
    await rm(path.join(missing.root, "comic-book-images", "book-1", "original.jpg"));
    await expect(migrateLegacyData({ dataDir: missing.root, email: "legacy@example.com", password })).rejects.toThrow(/Missing image source/);

    const owned = await fixture();
    const record = JSON.parse(await readFile(path.join(owned.root, "comic-books", "book-1.json"), "utf8"));
    record.ownerUserId = "foreign";
    record.revision = 1;
    await writeFile(path.join(owned.root, "comic-books", "book-1.json"), JSON.stringify(record));
    await expect(migrateLegacyData({ dataDir: owned.root, email: "legacy@example.com", password })).rejects.toThrow(/must not have an owner/);
    await expect(preflightLegacyData(owned.root, "legacy@example.com")).rejects.toThrow(/must not have an owner/);

    const changed = await fixture();
    await expect(migrateLegacyData({ dataDir: changed.root, email: "legacy@example.com", password, interruptAfterBooks: 1 })).rejects.toThrow(/Simulated interruption/);
    await writeFile(path.join(changed.root, "unknown.dat"), "changed");
    await expect(migrateLegacyData({ dataDir: changed.root, email: "legacy@example.com" })).rejects.toThrow(/Unexpected file hash/);
  });

  it("requires empty initialization and reads passwords from self-describing hashes", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "comic-empty-"));
    roots.push(root);
    await expect(initializeEmptyData(root)).resolves.toMatchObject({ schemaVersion: 2, legacyUserId: null });
    await expect(initializeEmptyData(root)).rejects.toThrow(/state already exists/);
    await expect(readDataState(path.join(root, "missing"))).rejects.toThrow(/incomplete/);
    const interrupted = await mkdtemp(path.join(os.tmpdir(), "comic-empty-interrupted-"));
    roots.push(interrupted);
    await mkdir(path.join(interrupted, "auth"), { recursive: true });
    await writeFile(path.join(interrupted, "auth", "users.json"), JSON.stringify({ schemaVersion: 1, users: [] }));
    await expect(initializeEmptyData(interrupted)).resolves.toMatchObject({ legacyUserId: null });
    const hash = await hashPassword(password);
    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("wrong password string", hash)).toBe(false);
  });
});
