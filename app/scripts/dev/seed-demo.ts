/**
 * Builds a disposable demo data directory with ready-made accounts and comic books.
 * Usage: pnpm dev:seed [--reset]   (data lives in app/tmp/dev-data, which git ignores)
 * Accounts: dev / devdev (auto sign-in with pnpm dev:demo) and friend / devdev.
 */
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { initializeEmptyData } from "../../src/lib/migrations/legacy-ownership.server.ts";
import { hashPassword } from "../../src/lib/auth/password.server.ts";
import { addUser } from "../../src/lib/auth/users.server.ts";
import { demoBooks } from "./demo-books.ts";

const appRoot = path.resolve(import.meta.dirname, "../..");
const dataDir = path.join(appRoot, "tmp", "dev-data");
const reset = process.argv.includes("--reset");

async function main() {
  if (existsSync(path.join(dataDir, "data-state.json")) && !reset) {
    console.log(`Demo data already exists at ${dataDir}. Pass --reset to rebuild it.`);
    return;
  }
  if (!dataDir.startsWith(path.join(appRoot, "tmp") + path.sep)) throw new Error("Refusing to touch a data dir outside app/tmp.");
  await rm(dataDir, { recursive: true, force: true });
  await mkdir(dataDir, { recursive: true });
  await initializeEmptyData(dataDir);

  const passwordHash = await hashPassword("devdev");
  const dev = await addUser({ username: "dev", passwordHash }, dataDir);
  const friend = await addUser({ username: "friend", passwordHash }, dataDir);

  const books = demoBooks({ dev: dev.id, friend: friend.id });
  await mkdir(path.join(dataDir, "comic-books"), { recursive: true });
  for (const { book, images } of books) {
    await writeFile(path.join(dataDir, "comic-books", `${book.id}.json`), `${JSON.stringify(book, null, 2)}\n`);
    for (const image of images) {
      const dir = path.join(dataDir, "comic-book-images", book.id);
      await mkdir(dir, { recursive: true });
      await copyFile(path.join(appRoot, "public", "art", image.source), path.join(dir, image.filename));
    }
  }
  console.log(`Seeded ${books.length} books for dev and friend (password: devdev) in ${dataDir}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
