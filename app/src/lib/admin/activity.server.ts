import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { resolveAppDataDir } from "~/lib/server/data-dir";
import type { ActivityEvent } from "./types";

const recent = new Map<string, number>();
let writes = Promise.resolve();
const eventPath = () => path.join(resolveAppDataDir(), "admin", "events.jsonl");

/** Activity must never turn a completed save into a reported failure. */
export async function recordActivity(event: Omit<ActivityEvent, "id" | "at">) {
  const file = eventPath();
  const now = Date.now();
  const grouped = event.type === "book.saved" || event.type === "book.opened";
  const key = `${file}:${event.type}:${event.userId}:${event.bookId}`;
  if (grouped && now - (recent.get(key) ?? 0) < 5 * 60_000) return;
  const row: ActivityEvent = { ...event, id: randomUUID(), at: new Date(now).toISOString() };
  const write = writes.then(async () => {
    if (grouped && now - (recent.get(key) ?? 0) < 5 * 60_000) return;
    await mkdir(path.dirname(file), { recursive: true });
    await appendFile(file, `${JSON.stringify(row)}\n`, { mode: 0o600 });
    if (grouped) recent.set(key, now);
    for (const [id, time] of recent) if (now - time >= 5 * 60_000) recent.delete(id);
  });
  writes = write.catch(() => { console.error("Activity could not be recorded."); });
  await writes;
}

export async function readActivity() {
  const file = eventPath();
  try {
    await writes;
    const content = await readFile(file, "utf8");
    const events: ActivityEvent[] = content.split("\n").filter(Boolean).map((line) => JSON.parse(line));
    return { events, bytes: (await stat(file)).size };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { events: [], bytes: 0 };
    throw new Error("Activity records could not be read. Check server storage, then try again.");
  }
}
