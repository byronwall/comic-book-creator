import { randomUUID } from "node:crypto";
import { mkdir, open, rename, unlink } from "node:fs/promises";
import path from "node:path";

const writes = new Map<string, Promise<void>>();

export async function writeFileAtomic(filePath: string, contents: string | Uint8Array) {
  const target = path.resolve(filePath);
  const prior = (writes.get(target) ?? Promise.resolve()).catch(() => undefined);
  const next = prior.then(async () => {
    await mkdir(path.dirname(target), { recursive: true });
    const temp = `${target}.${process.pid}.${randomUUID()}.tmp`;
    try {
      const handle = await open(temp, "wx", 0o600);
      try {
        await handle.writeFile(contents);
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temp, target);
    } catch (error) {
      await unlink(temp).catch(() => undefined);
      throw error;
    }
  });
  writes.set(target, next);
  try {
    await next;
  } finally {
    if (writes.get(target) === next) writes.delete(target);
  }
}
