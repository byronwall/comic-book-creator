import { createHash, randomUUID } from "node:crypto";
import { chmod, copyFile, lstat, mkdir, readFile, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import type { User } from "../auth/types.ts";
import { writeFileAtomic } from "../server/atomic-file.ts";

export interface MigrationJournal {
  schemaVersion: 1;
  migrationId: string;
  email: string;
  user: User;
  backupDir: string;
  source: Record<string, string>;
  targets: Record<string, string>;
  bookIds: string[];
}

export function requireAbsolute(value: string) { if (!path.isAbsolute(value)) throw new Error("An explicit absolute --data-dir is required."); }
export function sha256(value: string | Buffer) { return createHash("sha256").update(value).digest("hex"); }
export async function pathExists(file: string) { try { await lstat(file); return true; } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return false; throw e; } }
export async function readOptionalJson(file: string) { try { return JSON.parse(await readFile(file, "utf8")); } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return null; throw e; } }

export async function inventory(root: string): Promise<string[]> {
  const files: string[] = [];
  async function visit(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(root, full).split(path.sep).join("/");
      const info = await lstat(full);
      if (rel === "migrations/legacy-ownership" || rel.startsWith("migrations/legacy-ownership/") || rel === "data-state.json") continue;
      if (info.isSymbolicLink()) throw new Error(`Symbolic links are not supported in migration data: ${rel}`);
      if (info.isDirectory()) await visit(full);
      else if (info.isFile()) files.push(rel);
      else throw new Error(`Unsupported filesystem entry: ${rel}`);
    }
  }
  if (await pathExists(root)) await visit(root);
  return files.sort();
}

export async function validateImages(root: string, bookId: string, pages: unknown[], source: string) {
  for (const pageValue of pages) {
    if (!pageValue || typeof pageValue !== "object") throw new Error(`Invalid page in ${source}`);
    const page = pageValue as Record<string, unknown>;
    const images = [...(Array.isArray(page.images) ? page.images : []), ...(page.image !== undefined ? [page.image] : [])];
    const imageIds = new Set<string>();
    for (const imageValue of images) {
      if (!imageValue || typeof imageValue !== "object") throw new Error(`Invalid image reference in ${source}`);
      const image = imageValue as Record<string, unknown>;
      if (typeof image.filename !== "string" || !image.filename) throw new Error(`Missing image filename in ${source}`);
      if (typeof image.id === "string") {
        if (imageIds.has(image.id)) throw new Error(`Duplicate image ID in ${source}`);
        imageIds.add(image.id);
      }
      if (image.crop !== undefined && (!image.crop || typeof image.crop !== "object" || Array.isArray(image.crop))) throw new Error(`Invalid crop source in ${source}`);
      const crop = image.crop as Record<string, unknown> | undefined;
      if (crop && (typeof crop.sourceFilename !== "string" || !crop.sourceFilename)) throw new Error(`Missing crop source filename in ${source}`);
      for (const name of [image.filename, crop?.sourceFilename]) {
        if (name === undefined) continue;
        if (typeof name !== "string" || !/^[a-zA-Z0-9._-]{1,180}$/.test(name) || path.basename(name) !== name || name.includes("\\")) {
          throw new Error(`Invalid image path in ${source}`);
        }
        const imagePath = path.join(root, "comic-book-images", bookId, name);
        // lstat keeps broken symlinks and non-files from being mistaken for image files.
        try { if (!(await lstat(imagePath)).isFile()) throw new Error(`Image source is not a file: ${imagePath}`); }
        catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") throw new Error(`Missing image source: ${imagePath}`); throw e; }
      }
    }
  }
}

async function resolveLocation(location: string): Promise<string> {
  try { return await realpath(location); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const parent = path.dirname(location);
    if (parent === location) throw error;
    return path.join(await resolveLocation(parent), path.basename(location));
  }
}

export async function backupLocation(root: string, backupDir?: string) {
  if (backupDir) requireAbsolute(backupDir);
  const parent = await resolveLocation(path.resolve(backupDir ?? path.dirname(root)));
  const source = await resolveLocation(root);
  if (parent === source || parent.startsWith(`${source}${path.sep}`)) throw new Error("The backup directory must be outside the data tree.");
  return parent;
}

export async function createBackup(root: string, files: string[], backupDir?: string) {
  const parent = await backupLocation(root, backupDir);
  await mkdir(parent, { recursive: true });
  const backup = path.join(parent, `${path.basename(root)}.backup-${new Date().toISOString().replaceAll(":", "-")}-${randomUUID()}`);
  await mkdir(backup, { recursive: false, mode: 0o700 });
  for (const relative of files) {
    const target = path.join(backup, "files", relative);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(root, relative), target);
    await chmod(target, 0o400);
  }
  const sourceHashes = Object.fromEntries(await Promise.all(files.map(async (file) => [file, sha256(await readFile(path.join(root, file)))])));
  const backupHashes = Object.fromEntries(await Promise.all(files.map(async (file) => [file, sha256(await readFile(path.join(backup, "files", file)))])));
  if (JSON.stringify(sourceHashes) !== JSON.stringify(backupHashes)) throw new Error("Backup manifest verification failed.");
  await writeFileAtomic(path.join(backup, ".manifest.json"), `${JSON.stringify(sourceHashes, null, 2)}\n`);
  await chmod(path.join(backup, ".manifest.json"), 0o400);
  return backup;
}

export async function checkHashes(root: string, journal: MigrationJournal, files: string[]) {
  const known = new Set([...Object.keys(journal.source), ...Object.keys(journal.targets)]);
  for (const file of files) {
    if (!known.has(file)) throw new Error(`Unexpected file appeared during migration: ${file}`);
  }
  for (const file of Object.keys(journal.source)) {
    if (!files.includes(file)) throw new Error(`Source file is missing during migration: ${file}`);
  }
  for (const file of known) {
    if (!(await pathExists(path.join(root, file)))) {
      if (journal.source[file] === undefined) continue;
      throw new Error(`Migration file is missing: ${file}`);
    }
    const current = sha256(await readFile(path.join(root, file)));
    if (current !== journal.source[file] && current !== journal.targets[file]) throw new Error(`Unexpected file hash; refusing migration: ${file}`);
  }
}

export async function compareMigrated(root: string, sourceFiles: string[], records: Array<{relative:string;book:Record<string,unknown>}>, journal: MigrationJournal) {
  for (const file of sourceFiles) {
    const data = await readFile(path.join(root, file));
    if (journal.targets[file]) {
      if (sha256(data) !== journal.targets[file]) throw new Error(`Migrated book hash mismatch: ${file}`);
    } else if (sha256(data) !== journal.source[file]) throw new Error(`Preserved file hash mismatch: ${file}`);
  }
  for (const record of records) {
    const migrated = JSON.parse(await readFile(path.join(root, record.relative), "utf8")) as Record<string, unknown>;
    const { ownerUserId: _owner, revision: _revision, ...original } = migrated;
    const { ownerUserId: _oldOwner, revision: _oldRevision, ...expected } = record.book;
    if (JSON.stringify(original) !== JSON.stringify(expected)) throw new Error(`Book content changed during migration: ${record.relative}`);
  }
}

export async function verifyBackup(journal: MigrationJournal) {
  const manifest = await readOptionalJson(path.join(journal.backupDir, ".manifest.json"));
  if (!manifest || JSON.stringify(manifest) !== JSON.stringify(journal.source)) throw new Error("Backup manifest does not match migration journal.");
  for (const [file, hash] of Object.entries(journal.source)) {
    if (sha256(await readFile(path.join(journal.backupDir, "files", file))) !== hash) throw new Error(`Backup file hash mismatch: ${file}`);
  }
}
