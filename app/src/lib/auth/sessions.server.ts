import { createHash, randomBytes } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { getRequestEvent } from "solid-js/web";
import { deleteCookie, setCookie } from "vinxi/http";
import { resolveAppDataDir } from "~/lib/server/data-dir";
import { writeFileAtomic } from "~/lib/server/atomic-file";
import { appPath } from "~/lib/router/app-path";
import { readDataState } from "./data-state.server";
import { readUserStore } from "./users.server";
import { DEV_SIGNED_OUT_COOKIE, devAutoAccount, devAutoSignInEnabled } from "./dev-sign-in.server";
import { fail } from "./http.server";
import type { User } from "./types";

export type Account = Pick<User, "id" | "username">;
export interface Session { tokenHash: string; userId: string; createdAt: string; expiresAt: string }
export const SESSION_COOKIE = "comic_session";
const lifetime = 30 * 24 * 60 * 60;
const digest = (token: string) => createHash("sha256").update(token).digest("hex");
const sessionPath = (hash: string) => path.join(resolveAppDataDir(), "auth", "sessions", `${hash}.json`);

export async function preparedAccounts() {
  try {
    const state = await readDataState();
    const store = await readUserStore();
    if (state.legacyUserId && !store.users.some((user) => user.id === state.legacyUserId)) {
      throw new Error("Legacy account is missing.");
    }
    return { state, store };
  } catch { return fail(503, "Account storage is unavailable. Ask the site owner to check account setup."); }
}

export function requestToken(request: Request) {
  const token = request.headers.get("cookie")?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}

export async function readSession(request: Request) {
  const resolved = await readStoredSession(request);
  if (resolved || !devAutoSignInEnabled()) return resolved;
  const account = devAutoAccount(request, (await preparedAccounts()).store);
  return account ? { account, session: null } : null;
}

async function readStoredSession(request: Request) {
  const token = requestToken(request);
  if (!token) return null;
  const { store } = await preparedAccounts();
  const tokenHash = digest(token);
  let session: Session;
  try { session = JSON.parse(await readFile(sessionPath(tokenHash), "utf8")); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    return fail(503, "Session storage is unavailable.");
  }
  if (!session || session.tokenHash !== tokenHash || typeof session.userId !== "string"
    || !Number.isFinite(Date.parse(session.createdAt)) || !Number.isFinite(Date.parse(session.expiresAt))) {
    return fail(503, "Session storage is invalid.");
  }
  if (Date.parse(session.expiresAt) <= Date.now()) return null;
  const user = store.users.find((item) => item.id === session.userId);
  return user ? { account: { id: user.id, username: user.username }, session } : null;
}

export async function issueSession(userId: string, request: Request) {
  const token = randomBytes(32).toString("hex");
  const session: Session = {
    tokenHash: digest(token), userId, createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + lifetime * 1000).toISOString(),
  };
  await writeFileAtomic(sessionPath(session.tokenHash), `${JSON.stringify(session)}\n`);
  await revokeSession(request);
  return { token, session };
}

export async function revokeSession(request: Request) {
  const token = requestToken(request);
  if (!token) return;
  try { await unlink(sessionPath(digest(token))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
}

function cookieOptions() {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: appPath("/") };
}
export function setSessionCookie(token: string) {
  const event = getRequestEvent();
  if (!event) throw new Error("A request is required.");
  setCookie(event.nativeEvent, SESSION_COOKIE, token, { ...cookieOptions(), maxAge: lifetime });
  if (devAutoSignInEnabled()) deleteCookie(event.nativeEvent, DEV_SIGNED_OUT_COOKIE, cookieOptions());
}
export function clearSessionCookie() {
  const event = getRequestEvent();
  if (!event) throw new Error("A request is required.");
  deleteCookie(event.nativeEvent, SESSION_COOKIE, cookieOptions());
  if (devAutoSignInEnabled()) setCookie(event.nativeEvent, DEV_SIGNED_OUT_COOKIE, "1", cookieOptions());
}
