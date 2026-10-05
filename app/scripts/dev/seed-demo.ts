/**
 * Builds a disposable demo data directory with ready-made accounts and comic books.
 * Usage: pnpm dev:seed [--reset]   (data lives in app/tmp/dev-data, which git ignores)
 * Accounts: dev / devdev (auto sign-in with pnpm dev:demo) friend / devdev, newcomer / devdev, and paused / devdev (disabled).
 */
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { initializeEmptyData } from "../../src/lib/auth/storage.server.ts";
import { hashPassword } from "../../src/lib/auth/password.server.ts";
import { addUser, replaceUserStore } from "../../src/lib/auth/users.server.ts";
import { demoActivity } from "./demo-activity.ts";
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
  const now = Date.now();
  const createdAt = (daysAgo: number) => new Date(now - daysAgo * 86_400_000).toISOString();
  const dev = await addUser({ username: "dev", passwordHash, createdAt: createdAt(21) }, dataDir);
  const friend = await addUser({ username: "friend", passwordHash, createdAt: createdAt(12) }, dataDir);
  const newcomer = await addUser({ username: "newcomer", passwordHash, createdAt: createdAt(0.2) }, dataDir);
  const paused = await addUser({ username: "paused", passwordHash, createdAt: createdAt(10) }, dataDir);
  paused.disabled = true;
  await replaceUserStore({ schemaVersion: 1, users: [dev, friend, newcomer, paused] }, dataDir);

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
  const events = demoActivity({ dev: dev.id, friend: friend.id, newcomer: newcomer.id, paused: paused.id }, now);
  await mkdir(path.join(dataDir, "admin"), { recursive: true });
  await writeFile(path.join(dataDir, "admin", "events.jsonl"), events.map((event) => JSON.stringify(event)).join("\n") + "\n", { mode: 0o600 });
  console.log(`Seeded ${books.length} books, ${events.length} events, and four demo accounts (password: devdev) in ${dataDir}. Dev is the demo admin.`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
