import { mkdtempSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createComicBookOnDisk,
  deleteComicBookOnDisk,
  readComicBookSummariesFromDisk,
  readComicBookByIdFromDisk,
  readComicBookImage,
  writeComicBookByIdToDisk,
  saveComicBookImage,
} from "./data.server";
import type { ComicBook, ComicPageImage, ComicPhotoCorners } from "./types";

const userA = "user-a";
const userB = "user-b";
const priorDataDir = process.env.APP_DATA_DIR;

afterEach(() => {
  if (priorDataDir === undefined) delete process.env.APP_DATA_DIR;
  else process.env.APP_DATA_DIR = priorDataDir;
});

describe("comic book persistence", () => {
  it("keeps crop originals, image transforms, and trailing spaces", async () => {
    await setup();
    const book = await createComicBookOnDisk(userA, { title: "Crop test" });
    const corners: ComicPhotoCorners = [
      { x: 0.1, y: 0.2 }, { x: 0.9, y: 0.1 }, { x: 0.85, y: 0.9 }, { x: 0.15, y: 0.8 },
    ];
    const image = {
      id: "image-1", src: "", filename: "processed.png", originalName: "page.jpg", mimeType: "image/png",
      treatment: "grayscale", brightness: 105, contrast: 125, threshold: 58,
      x: 3, y: 4, width: 90, height: 80, rotation: 5, fit: "contain", scale: 120, offsetX: 2,
      crop: { sourceFilename: "original.jpg", corners },
    } satisfies ComicPageImage;
    const saved = await writeComicBookByIdToDisk(userA, book.id, {
      ...book,
      pages: [{ ...book.pages[0], mode: "image", images: [image], texts: [textElement("HELLO THERE ")] }],
    });
    const persisted = await readComicBookByIdFromDisk(userA, book.id);
    expect(saved?.revision).toBe(2);
    expect(persisted?.pages[0]?.images?.[0]?.crop).toEqual(image.crop);
    expect(persisted?.pages[0]?.images?.[0]?.filename).toBe("processed.png");
    expect(persisted?.pages[0]?.images?.[0]?.rotation).toBe(5);
    expect(persisted?.pages[0]?.texts[0]?.text).toBe("HELLO THERE ");
  });

  it("isolates account reads and ignores forged owners on save", async () => {
    await setup();
    const book = await createComicBookOnDisk(userA, { title: "Private" });
    expect(book.pages).toHaveLength(1);
    expect(book.pages[0]?.texts).toEqual([]);
    const forged = await writeComicBookByIdToDisk(userA, book.id, { ...book, ownerUserId: userB, title: "Updated" });
    expect(forged?.ownerUserId).toBe(userA);
    expect(await readComicBookByIdFromDisk(userB, book.id)).toBeNull();
    expect(await readComicBookSummariesFromDisk(userB)).toEqual([]);
    expect((await readComicBookSummariesFromDisk(userA)).map(({ id }) => id)).toEqual([book.id]);
  });

  it("allows one concurrent save at a revision and rejects the stale save", async () => {
    await setup();
    const book = await createComicBookOnDisk(userA);
    const results = await Promise.allSettled([
      writeComicBookByIdToDisk(userA, book.id, { ...book, title: "First" }),
      writeComicBookByIdToDisk(userA, book.id, { ...book, title: "Second" }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason).toBeInstanceOf(Response);
    expect(rejected?.status === "rejected" && rejected.reason.status).toBe(409);
    expect((await readComicBookByIdFromDisk(userA, book.id))?.revision).toBe(2);
  });

  it("does not recreate a deleted or missing book during save", async () => {
    await setup();
    const book = await createComicBookOnDisk(userA);
    expect(await deleteComicBookOnDisk(userA, book.id)).toBe(true);
    expect(await writeComicBookByIdToDisk(userA, book.id, book)).toBeNull();
    expect(await readComicBookByIdFromDisk(userA, book.id)).toBeNull();
  });

  it("serializes image writes with deletion and rejects foreign image access", async () => {
    await setup();
    const book = await createComicBookOnDisk(userA);
    await saveComicBookImage(userA, book.id, "crop-original.jpg", "image/jpeg", new Uint8Array([1, 2, 3]));
    expect(await readComicBookByIdFromDisk(userB, book.id)).toBeNull();
    expect(await readComicBookImage(userB, book.id, "crop-original.jpg")).toBeNull();
    expect(await deleteComicBookOnDisk(userA, book.id)).toBe(true);
    expect(await readComicBookImage(userA, book.id, "crop-original.jpg")).toBeNull();
  });
});

async function setup() {
  const dataDir = mkdtempSync(path.join(os.tmpdir(), "comic-book-owner-"));
  process.env.APP_DATA_DIR = dataDir;
  await mkdir(path.join(dataDir, "auth"), { recursive: true });
  await writeFile(path.join(dataDir, "data-state.json"), JSON.stringify({
    schemaVersion: 2, legacyUserId: userA, migrationId: "test", completedAt: new Date().toISOString(),
  }));
  await writeFile(path.join(dataDir, "auth", "users.json"), JSON.stringify({ schemaVersion: 1, users: [userA, userB].map((id) => ({
    id, email: `${id}@example.test`, passwordHash: "test", createdAt: new Date().toISOString(),
  })) }));
}

function textElement(text: string): ComicBook["pages"][number]["texts"][number] {
  return { id: "speech-1", kind: "speech", text, panelIndex: 0, positionScope: "page", x: 10, y: 10, width: 34, fontSize: 18, align: "center" };
}
