import { hashPassword } from "./password.server";
import { addUser, normalizeEmail } from "./users.server";
import { passwordWork } from "./login.server";
import { preparedAccounts } from "./sessions.server";
import { fail } from "./http.server";

export async function registerAccount(emailInput: string, password: string) {
  await preparedAccounts();
  const email = normalizeEmail(emailInput);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, "Enter a valid email address.");
  if (password.length < 15 || password.length > 128) fail(400, "Use a password with 15 to 128 characters.");
  const passwordHash = await passwordWork(() => hashPassword(password));
  try { return await addUser({ email, passwordHash }); }
  catch (error) {
    if (error instanceof Error && error.message === "Email already exists.") {
      return fail(409, "An account already uses this email. Sign in instead.");
    }
    throw error;
  }
}
