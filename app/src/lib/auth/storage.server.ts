import path from "node:path";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { readDataState } from "./data-state.server.ts";
import { readUserStore, replaceUserStore } from "./users.server.ts";
import { writeFileAtomic } from "../server/atomic-file.ts";
import type { DataState } from "./types.ts";

function storageRoot(dataDir: string) {
  if (!path.isAbsolute(dataDir)) throw new Error("Use an absolute data directory path.");
  return path.resolve(dataDir);
}

export async function prepareStartupStorage(dataDir: string) {
  const root = storageRoot(dataDir);
  const state = await readDataState(root);
  const store = await readUserStore(root);
  const users = new Set(store.users.map((user) => user.id));
  if (state.legacyUserId !== null && !users.has(state.legacyUserId)) {
    throw new Error("Tool owner account is missing.");
  }
  const booksDir = path.join(root, "comic-books");
  let files: string[];
  try { files = await readdir(booksDir); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return state;
  }
  for (const file of files.filter((file) => file.endsWith(".json"))) {
    const book = JSON.parse(await readFile(path.join(booksDir, file), "utf8"));
    if (!book || !users.has(book.ownerUserId) || !Number.isSafeInteger(book.revision) || book.revision < 1) {
      throw new Error(`Book has an invalid owner or revision: ${file}`);
    }
  }
  return state;
}

export async function initializeEmptyData(dataDir: string): Promise<DataState> {
  const root = storageRoot(dataDir);
  await mkdir(root, { recursive: true });
  const files = await storageFiles(root);
  // Allow an interrupted empty initialization to finish. Never replace existing accounts or books.
  if (files.length > 0) {
    if (files.length !== 1 || files[0] !== "auth/users.json" || (await readUserStore(root)).users.length > 0) {
      throw new Error("Empty initialization requires an empty data directory.");
    }
  }
  const state: DataState = { schemaVersion: 2, legacyUserId: null };
  await replaceUserStore({ schemaVersion: 1, users: [] }, root);
  await writeFileAtomic(path.join(root, "data-state.json"), `${JSON.stringify(state, null, 2)}\n`);
  return state;
}

async function storageFiles(root: string, dir = ""): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
    const relative = path.posix.join(dir, entry.name);
    if (relative === ".writer.lock" && entry.isFile()) continue;
    if (entry.isDirectory()) files.push(...await storageFiles(root, relative));
    else files.push(relative);
  }
  return files;
}
