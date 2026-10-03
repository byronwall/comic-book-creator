import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { resolveAppDataDir } from "../server/data-dir.ts";
import { writeFileAtomic } from "../server/atomic-file.ts";
import type { User, UserStore } from "./types";

const updates = new Map<string, Promise<unknown>>();
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const usersPath = (dataDir = resolveAppDataDir()) => path.join(dataDir, "auth", "users.json");

export async function readUserStore(dataDir = resolveAppDataDir()): Promise<UserStore> {
  try {
    const parsed: unknown = JSON.parse(await readFile(usersPath(dataDir), "utf8"));
    if (!isUserStore(parsed)) throw new Error("Account registry has an invalid format.");
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error("Account registry is missing.");
    throw error;
  }
}

export async function addUser(user: Omit<User, "id" | "createdAt"> & Partial<Pick<User, "id" | "createdAt">>, dataDir = resolveAppDataDir()) {
  const file = usersPath(dataDir);
  return serialize(file, async () => {
    const store = await readUserStore(dataDir);
    const email = normalizeEmail(user.email);
    if (!email || store.users.some((item) => item.email === email)) throw new Error("Email already exists.");
    const next: User = {
      id: user.id ?? randomUUID(), email, passwordHash: user.passwordHash,
      createdAt: user.createdAt ?? new Date().toISOString(),
    };
    if (!next.passwordHash || store.users.some((item) => item.id === next.id)) throw new Error("Invalid or duplicate account.");
    store.users.push(next);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFileAtomic(file, `${JSON.stringify(store, null, 2)}\n`);
    return next;
  });
}

export async function replaceUserStore(store: UserStore, dataDir = resolveAppDataDir()) {
  if (!isUserStore(store)) throw new Error("Account registry has an invalid format.");
  const file = usersPath(dataDir);
  await serialize(file, async () => writeFileAtomic(file, `${JSON.stringify(store, null, 2)}\n`));
}

function isUserStore(value: unknown): value is UserStore {
  if (!value || typeof value !== "object") return false;
  const store = value as UserStore;
  if (store.schemaVersion !== 1 || !Array.isArray(store.users)) return false;
  const ids = new Set<string>();
  const emails = new Set<string>();
  for (const user of store.users) {
    if (!user || typeof user.id !== "string" || !user.id || ids.has(user.id)
      || typeof user.email !== "string" || user.email !== normalizeEmail(user.email) || !user.email || emails.has(user.email)
      || typeof user.passwordHash !== "string" || !user.passwordHash || typeof user.createdAt !== "string") return false;
    ids.add(user.id); emails.add(user.email);
  }
  return true;
}

function serialize<T>(key: string, action: () => Promise<T>): Promise<T> {
  const prior = (updates.get(key) ?? Promise.resolve()).catch(() => undefined);
  const next = prior.then(action);
  updates.set(key, next);
  return next.finally(() => { if (updates.get(key) === next) updates.delete(key); });
}
