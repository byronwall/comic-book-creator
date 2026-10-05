import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { withUserStore, usersPath } from "~/lib/auth/users.server";
import { hashPassword } from "~/lib/auth/password.server";
import { passwordWork } from "~/lib/auth/login.server";
import { readDataState } from "~/lib/auth/data-state.server";
import { fail } from "~/lib/auth/http.server";
import type { Account, Session } from "~/lib/auth/sessions.server";
import { resolveAppDataDir } from "~/lib/server/data-dir";
import { writeFileAtomic } from "~/lib/server/atomic-file";
import { readLibrary } from "./library.server";
import { isAdminUsername } from "./access.server";
import { recordActivity } from "./activity.server";
import type { EventType } from "./types";

const actions = ["password-reset", "disable", "enable", "delete"] as const;
export type AccountOperation = typeof actions[number];

export async function manageAccount(actor: Account, input: FormData) {
  if (input.get("confirmed") !== "yes") fail(400, "Confirm that you understand this account action.");
  const operation = input.get("operation");
  const userId = input.get("targetUserId");
  if (!actions.includes(operation as AccountOperation) || typeof userId !== "string") fail(400, "Choose a user and an account action.");
  const password = input.get("password");
  if (operation === "password-reset" && (typeof password !== "string" || password.length < 6 || password.length > 128)) {
    fail(400, "Use a password with 6 to 128 characters.");
  }
  const passwordHash = operation === "password-reset"
    ? await passwordWork(() => hashPassword(password as string)) : undefined;
  return withUserStore(async (store) => {
    // Recheck the actor after entering the account write queue.
    const admin = store.users.find((user) => user.id === actor.id && !user.disabled);
    if (!admin || !isAdminUsername(admin.username)) fail(403, "Admin access is no longer available.");
    const target = store.users.find((user) => user.id === userId);
    if (!target) fail(404, "This account no longer exists. Refresh the user table.");
    if ((operation === "disable" || operation === "delete") && (target.id === actor.id || isAdminUsername(target.username))) {
      fail(400, "You cannot disable or delete the admin account.");
    }
    if (operation === "delete" && input.get("confirmUsername") !== target.username) {
      fail(400, "Type the exact username to confirm account deletion.");
    }
    const root = resolveAppDataDir();
    if (operation === "password-reset") {
      await revokeUserSessions(root, target.id);
      target.passwordHash = passwordHash!;
    }
    if (operation === "enable") target.disabled = false;
    if (operation === "disable" || operation === "delete") target.disabled = true;
    await writeFileAtomic(usersPath(), `${JSON.stringify(store, null, 2)}\n`);
    // Persist disabled status before removing files. A failed deletion can be retried.
    if (operation === "disable" || operation === "delete") await revokeUserSessions(root, target.id);
    if (operation === "delete") {
      const records = (await readLibrary()).filter(({ book }) => book.ownerUserId === target.id);
      for (const record of records) {
        await rm(record.images, { recursive: true, force: true });
        await rm(record.file, { force: true });
      }
      const state = await readDataState(root);
      if (state.legacyUserId === target.id) {
        await writeFileAtomic(path.join(root, "data-state.json"), `${JSON.stringify({ ...state, legacyUserId: null }, null, 2)}\n`);
      }
      store.users = store.users.filter((user) => user.id !== target.id);
      await writeFileAtomic(usersPath(), `${JSON.stringify(store, null, 2)}\n`);
    }
    const type: EventType = operation === "password-reset" ? "admin.password-reset"
      : operation === "disable" ? "admin.disabled" : operation === "enable" ? "admin.enabled" : "admin.deleted";
    await recordActivity({ type, userId: actor.id, targetUserId: target.id, targetUsername: target.username });
    return { message: operation === "password-reset" ? `Password reset for ${target.username}. Share the new password with them.`
      : operation === "delete" ? `Deleted ${target.username} and their library.`
      : `${target.username} is now ${operation === "enable" ? "enabled" : "disabled"}.` };
  });
}

async function revokeUserSessions(root: string, userId: string) {
  const dir = path.join(root, "auth", "sessions");
  let files: string[];
  try { files = await readdir(dir); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
  for (const file of files.filter((file) => /^[a-f0-9]{64}\.json$/.test(file))) {
    const session: Session = JSON.parse(await readFile(path.join(dir, file), "utf8"));
    if (session.userId === userId) await rm(path.join(dir, file), { force: true });
  }
}
