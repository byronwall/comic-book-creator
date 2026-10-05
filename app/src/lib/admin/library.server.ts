import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { resolveAppDataDir } from "~/lib/server/data-dir";
import type { ComicBook } from "~/lib/comics/types";

export async function directoryBytes(dir: string): Promise<number> {
  let total = 0;
  for (const entry of await entries(dir)) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) total += await directoryBytes(file);
    else if (entry.isFile()) total += (await stat(file)).size;
  }
  return total;
}

export async function readLibrary() {
  const root = resolveAppDataDir();
  const records: Array<{ book: ComicBook; file: string; images: string; bytes: number }> = [];
  for (const entry of await entries(path.join(root, "comic-books"))) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const file = path.join(root, "comic-books", entry.name);
    const book: ComicBook = JSON.parse(await readFile(file, "utf8"));
    if (!book || typeof book.id !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(book.id)
      || entry.name !== `${book.id}.json` || typeof book.ownerUserId !== "string" || !Array.isArray(book.pages)) {
      throw new Error(`Comic storage is invalid: ${entry.name}`);
    }
    const images = path.join(root, "comic-book-images", book.id);
    records.push({ book, file, images, bytes: (await stat(file)).size + await directoryBytes(images) });
  }
  return records;
}

async function entries(dir: string) {
  try { return await readdir(dir, { withFileTypes: true }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}
