import { randomUUID } from "node:crypto";
import type { ActivityEvent, EventType } from "../../src/lib/admin/types.ts";

export function demoActivity(users: { dev: string; friend: string; newcomer: string; paused: string }, now: number) {
  const events: ActivityEvent[] = [];
  const add = (daysAgo: number, type: EventType, userId: string, extra: Partial<ActivityEvent> = {}) => {
    events.push({ id: randomUUID(), at: new Date(now - daysAgo * 86_400_000).toISOString(), type, userId, ...extra });
  };
  add(21, "account.created", users.dev);
  add(12, "account.created", users.friend);
  add(10, "account.created", users.paused);
  add(9, "book.created", users.dev, { bookId: "demo-photo-comic" });
  add(9, "photo.uploaded", users.dev, { bookId: "demo-photo-comic" });
  add(9, "photo.uploaded", users.dev, { bookId: "demo-photo-comic" });
  add(6, "book.created", users.dev, { bookId: "demo-space-pirates" });
  add(2, "book.saved", users.dev, { bookId: "demo-ninja-shark" });
  add(1, "account.signed-in", users.friend);
  add(1, "book.created", users.friend, { bookId: "demo-friend-book" });
  add(0.75, "book.opened", users.friend, { bookId: "demo-friend-book" });
  add(0.5, "admin.disabled", users.dev, { targetUserId: users.paused, targetUsername: "paused" });
  add(0.2, "account.created", users.newcomer);
  add(0.1, "account.signed-in", users.dev);
  add(0.05, "photo.uploaded", users.dev, { bookId: "demo-robo-kid" });
  add(0.01, "book.saved", users.dev, { bookId: "demo-robo-kid" });
  return events;
}
