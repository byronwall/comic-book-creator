import { hashPassword } from "./password.server";
import { addUser, normalizeUsername, validUsername } from "./users.server";
import { passwordWork } from "./login.server";
import { preparedAccounts } from "./sessions.server";
import { fail } from "./http.server";

export async function registerAccount(usernameInput: string, password: string) {
  const username = normalizeUsername(usernameInput);
  if (!validUsername(username)) fail(400, "Usernames use letters and numbers (up to 40), plus dots, dashes, or underscores. Start with a letter or number.");
  if (password.length < 6) fail(400, "Your password needs at least 6 characters.");
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
