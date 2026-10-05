import { recordActivity } from "~/lib/admin/activity.server";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { readDataState } from "~/lib/auth/data-state.server";
import { withActiveUser, readUserStore } from "~/lib/auth/users.server";
import { resolveAppDataDir } from "~/lib/server/data-dir";
import { writeFileAtomic } from "~/lib/server/atomic-file";
import { normalizeComicBook } from "./normalize";
import type { ComicBook, ComicBookSummary } from "./types";

const BOOKS = "comic-books";
const IMAGES = "comic-book-images";
const queues = new Map<string, Promise<unknown>>();

export async function readComicBookSummariesFromDisk(userId: string): Promise<ComicBookSummary[]> {
  await assertPrepared(userId);
  await ensureBooksDir();
  const files = (await readdir(booksDir())).filter((name) => name.endsWith(".json"));
  const books = await Promise.all(files.map((name) => readStoredBook(path.join(booksDir(), name))));
  return books.filter((book): book is ComicBook => book !== null && book.ownerUserId === userId).map((book) => ({
    id: book.id, title: book.title, updatedAt: book.updatedAt, pageCount: book.pages.length,
  })).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function readComicBookByIdFromDisk(userId: string, bookId: string): Promise<ComicBook | null> {
  await assertPrepared(userId);
  const book = await readById(bookId);
  if (book?.ownerUserId !== userId) return null;
  await recordActivity({ type: "book.opened", userId, bookId: book.id });
  return book;
}

export async function createComicBookOnDisk(userId: string, input: { title?: string } = {}): Promise<ComicBook> {
  return withActiveUser(userId, async () => {
    await assertPrepared(userId);
    await ensureBooksDir();
    const id = randomUUID();
    const title = text(input.title) || "Untitled Comic Book";
    const now = new Date().toISOString();
    const book = normalizeComicBook({
      id, ownerUserId: userId, revision: 1, title, updatedAt: now,
      pages: [{ id: "page-1", title: "Page 1", status: "Blank", layout: "four", paperSize: "letter-portrait", texts: [] }],
    });
    await writeFileAtomic(bookPath(id), serialize(book));
    await recordActivity({ type: "book.created", userId, bookId: id });
    return book;
  });
}

export async function writeComicBookByIdToDisk(userId: string, bookId: string, input: unknown): Promise<ComicBook | null> {
  return withActiveUser(userId, async () => {
    await assertPrepared(userId);
    const cleanId = validId(bookId);
    return serializeBook(cleanId, async () => {
      const current = await readById(cleanId);
      if (!current || current.ownerUserId !== userId) return null;
      const payload = validateBook(input);
      if (payload.revision !== current.revision) throw new Response("Comic book revision is stale", { status: 409 });
      const next = normalizeComicBook({
        ...payload,
        id: current.id,
        ownerUserId: current.ownerUserId,
        revision: current.revision + 1,
        updatedAt: new Date().toISOString(),
      });
      await writeFileAtomic(bookPath(cleanId), serialize(next));
      await recordActivity({ type: "book.saved", userId, bookId: cleanId });
      return next;
    });
  });
}

export async function deleteComicBookOnDisk(userId: string, bookId: string): Promise<boolean> {
  return withActiveUser(userId, async () => {
    await assertPrepared(userId);
    const cleanId = validId(bookId);
    return serializeBook(cleanId, async () => {
      const book = await readById(cleanId);
      if (!book || book.ownerUserId !== userId) return false;
      await rm(bookPath(cleanId), { force: true });
      await rm(imageDir(cleanId), { recursive: true, force: true });
      await recordActivity({ type: "book.deleted", userId, bookId: cleanId });
      return true;
    });
  });
}

export async function saveComicBookImage(
  userId: string,
  bookId: string,
  filename: string,
  mimeType: string,
  bytes: Uint8Array,
): Promise<void> {
  return withActiveUser(userId, async () => {
    await assertPrepared(userId);
    const cleanId = validId(bookId);
    const cleanFilename = validFilename(filename);
    await serializeBook(cleanId, async () => {
      const book = await readById(cleanId);
      if (!book || book.ownerUserId !== userId) throw new Response("Not found", { status: 404 });
      const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
      if (!allowed.has(mimeType) || bytes.byteLength > 25 * 1024 * 1024) throw new Response("Invalid image", { status: 400 });
      const dir = imageDir(cleanId);
      await mkdir(dir, { recursive: true });
      await writeFileAtomic(path.join(dir, cleanFilename), bytes);
      await recordActivity({ type: "photo.uploaded", userId, bookId: cleanId });
    });
  });
}

export async function readComicBookImage(userId: string, bookId: string, filename: string) {
  await assertPrepared(userId);
  const cleanId = validId(bookId);
  const cleanFilename = validFilename(filename);
  const book = await readById(cleanId);
  if (!book || book.ownerUserId !== userId) return null;
  try {
    const bytes = await readFile(path.join(imageDir(cleanId), cleanFilename));
    const extension = cleanFilename.split(".").pop()?.toLowerCase();
    const mimeType = extension === "jpg" || extension === "jpeg" ? "image/jpeg"
      : extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "application/octet-stream";
    return { bytes, mimeType };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw storageUnavailable();
  }
}

async function assertPrepared(userId: string) {
  try {
    await readDataState();
    const store = await readUserStore();
    if (!store.users.some((user) => user.id === userId && !user.disabled)) throw storageUnavailable();
  } catch {
    throw storageUnavailable();
  }
}

async function readById(bookId: string) {
  const cleanId = validId(bookId);
  await ensureBooksDir();
  return readStoredBook(bookPath(cleanId));
}

async function readStoredBook(file: string): Promise<ComicBook | null> {
  try {
    const parsed: unknown = JSON.parse(await readFile(file, "utf8"));
    if (!isStoredBook(parsed)) throw storageUnavailable();
    if (path.basename(file, ".json") !== parsed.id) throw storageUnavailable();
    return normalizeComicBook(parsed);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    if (error instanceof Response) throw error;
    throw storageUnavailable();
  }
}

function validateBook(input: unknown): ComicBook {
  if (!input || typeof input !== "object") throw new Response("Invalid comic book", { status: 400 });
  const book = input as Partial<ComicBook>;
  if (!Number.isSafeInteger(book.revision) || (book.revision ?? 0) < 1 || typeof book.title !== "string"
    || !Array.isArray(book.pages) || book.pages.length === 0 || !book.pages.every((page) => {
      if (!page || typeof page !== "object" || !Array.isArray(page.texts)
        || !page.texts.every((item) => !!item && typeof item === "object")
        || (page.images !== undefined && !Array.isArray(page.images))) return false;
      const grid = page.customGrid;
      return grid === undefined || (!!grid && Array.isArray(grid.verticalLines) && Array.isArray(grid.horizontalLines));
    })) {
    throw new Response("Invalid comic book", { status: 400 });
  }
  return book as ComicBook;
}

function isStoredBook(value: unknown): value is ComicBook {
  if (!value || typeof value !== "object") return false;
  const book = value as Partial<ComicBook>;
  return typeof book.id === "string" && typeof book.ownerUserId === "string" && !!book.ownerUserId
    && Number.isSafeInteger(book.revision) && (book.revision ?? 0) > 0
    && typeof book.title === "string" && typeof book.updatedAt === "string" && Array.isArray(book.pages);
}

function validId(value: string) {
  const clean = value.trim();
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(clean)) throw new Response("Invalid book id", { status: 404 });
  return clean;
}

function validFilename(value: string) {
  if (!value || path.basename(value) !== value || !/^[a-zA-Z0-9._-]{1,180}$/.test(value)) {
    throw new Response("Invalid image filename", { status: 404 });
  }
  return value;
}

function booksDir() { return path.join(resolveAppDataDir(), BOOKS); }
function bookPath(id: string) { return path.join(booksDir(), `${id}.json`); }
function imageDir(id: string) { return path.join(resolveAppDataDir(), IMAGES, id); }
async function ensureBooksDir() { await mkdir(booksDir(), { recursive: true }); }
function serialize(book: ComicBook) { return `${JSON.stringify(book, null, 2)}\n`; }
function text(value?: string) { return typeof value === "string" ? value.trim() : ""; }
function storageUnavailable() { return new Response("Comic storage unavailable", { status: 503 }); }

function serializeBook<T>(id: string, action: () => Promise<T>): Promise<T> {
  const prior = (queues.get(id) ?? Promise.resolve()).catch(() => undefined);
  const next = prior.then(action);
  queues.set(id, next);
  return next.finally(() => { if (queues.get(id) === next) queues.delete(id); });
}
