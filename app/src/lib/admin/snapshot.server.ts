import { readUserStore } from "~/lib/auth/users.server";
import type { Account } from "~/lib/auth/sessions.server";
import { isAdminUsername } from "./access.server";
import { readActivity } from "./activity.server";
import { readLibrary } from "./library.server";
import type { AdminSnapshot, AdminUser } from "./types";

export async function readAdminSnapshot(account: Account): Promise<AdminSnapshot> {
  const [store, library, activity] = await Promise.all([readUserStore(), readLibrary(), readActivity()]);
  const users: AdminUser[] = store.users.map((user) => {
    const records = library.filter(({ book }) => book.ownerUserId === user.id);
    const pages = records.flatMap(({ book }) => book.pages);
    const times = [user.createdAt, ...records.map(({ book }) => book.updatedAt),
      ...activity.events.filter((event) => event.userId === user.id && !event.type.startsWith("admin.")).map((event) => event.at)]
      .filter((value): value is string => typeof value === "string").sort();
    return {
      id: user.id, username: user.username, createdAt: user.createdAt, disabled: Boolean(user.disabled),
      isAdmin: isAdminUsername(user.username), lastActivity: times.at(-1) ?? null,
      books: records.length, pages: pages.length,
      photoPages: pages.filter((page) => (page.images?.length ?? (page.image ? 1 : 0)) > 0).length,
      textPages: pages.filter((page) => page.texts?.length > 0).length,
      photos: pages.reduce((count, page) => count + (page.images?.length ?? (page.image ? 1 : 0)), 0),
      bytes: records.reduce((count, record) => count + record.bytes, 0),
    };
  }).sort((a, b) => a.username < b.username ? -1 : a.username > b.username ? 1 : 0);
  return {
    account: { ...account, isAdmin: true }, users,
    events: [...activity.events].reverse(), eventCount: activity.events.length,
    eventBytes: activity.bytes, capturedSince: activity.events[0]?.at ?? null,
    generatedAt: new Date().toISOString(),
  };
}
