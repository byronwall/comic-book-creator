import { verifyPassword } from "./password.server";
import { normalizeEmail } from "./users.server";
import { fail } from "./http.server";
import { preparedAccounts } from "./sessions.server";

let busy = false;
let windowStart = 0;
let attempts = 0;
const dummyHash = `scrypt$131072$8$1$${Buffer.alloc(16).toString("base64url")}$${Buffer.alloc(64).toString("base64url")}`;

export async function passwordWork<T>(work: () => Promise<T>) {
  if (Date.now() - windowStart > 60_000) { windowStart = Date.now(); attempts = 0; }
  if (busy || attempts >= 30) fail(429, "Too many attempts. Wait a minute and try again.");
  attempts += 1;
  busy = true;
  try { return await work(); }
  finally { busy = false; }
}
export async function authenticate(email: string, password: string) {
  const { store } = await preparedAccounts();
  if (email.length > 254 || password.length > 128 || password.length < 15) return null;
  return passwordWork(async () => {
    const user = store.users.find((item) => item.email === normalizeEmail(email));
    const valid = await verifyPassword(password, user?.passwordHash ?? dummyHash);
    return user && valid ? user : null;
  });
}
