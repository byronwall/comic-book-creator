import { hashPassword } from "./password.server";
import path from "node:path";
import { addUser, normalizeUsername, readUserStore, validUsername } from "./users.server";
import { passwordWork } from "./login.server";
import { preparedAccounts } from "./sessions.server";
import { fail } from "./http.server";
import { resolveAppDataDir } from "../server/data-dir.ts";
import { pathExists } from "../migrations/legacy-ownership-files.ts";
import { migrateLegacyData } from "../migrations/legacy-ownership.server.ts";
import { prepareStartupStorage } from "../migrations/startup.server.ts";

export async function registerAccount(usernameInput: string, password: string) {
  const username = normalizeUsername(usernameInput);
  if (!validUsername(username)) fail(400, "Usernames use letters and numbers (up to 40), plus dots, dashes, or underscores. Start with a letter or number.");
  if (password.length < 6) fail(400, "Your password needs at least 6 characters.");
  const dataDir = resolveAppDataDir();
  if (!await pathExists(path.join(dataDir, "data-state.json"))) {
    const legacy = normalizeUsername(process.env.LEGACY_USERNAME ?? "");
    if (!legacy || username !== legacy) return fail(503, "The owner must create the legacy account before other accounts can register.");
    return passwordWork(async () => {
      try {
        const backupDir = process.env.MIGRATION_BACKUP_DIR;
        await migrateLegacyData({ dataDir, username, password, backupDir });
        await prepareStartupStorage({ dataDir, username, backupDir });
        return (await readUserStore(dataDir)).users.find((user) => user.username === username)!;
      } catch (error) {
        console.error(`Legacy signup stopped: ${error instanceof Error ? error.message : "Storage migration failed."}`);
        return fail(503, "Legacy setup could not finish. Keep your chosen password and ask the server owner to check the logs.");
      }
    });
  }
  await preparedAccounts();
  const passwordHash = await passwordWork(() => hashPassword(password));
  try { return await addUser({ username, passwordHash }); }
  catch (error) {
    if (error instanceof Error && error.message === "Username already exists.") {
      return fail(409, "Someone already has that username. Try a different one, or sign in if it's yours.");
    }
    throw error;
  }
}
