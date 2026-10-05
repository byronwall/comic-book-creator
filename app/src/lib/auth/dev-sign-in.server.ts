import type { UserStore } from "./types";

/**
 * Dev-only auto sign-in. Active only in the Vite dev server (never in a production build)
 * when DEV_AUTO_SIGN_IN names an existing username. Signing out sets an opt-out cookie
 * so signed-out pages can still be tested; signing in again clears it.
 */
export const DEV_SIGNED_OUT_COOKIE = "comic_dev_signed_out";

export function devAutoSignInEnabled() {
  return Boolean(import.meta.env?.DEV) && process.env.NODE_ENV !== "production" && Boolean(process.env.DEV_AUTO_SIGN_IN?.trim());
}

export function devAutoAccount(request: Request, store: UserStore) {
  if (!devAutoSignInEnabled()) return null;
  if (request.headers.get("cookie")?.split(";").some((part) => part.trim() === `${DEV_SIGNED_OUT_COOKIE}=1`)) return null;
  const username = process.env.DEV_AUTO_SIGN_IN?.trim().toLowerCase();
  const user = store.users.find((item) => item.username === username);
  return user && !user.disabled ? { id: user.id, username: user.username } : null;
}
