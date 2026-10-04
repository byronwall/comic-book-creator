import { getRequestEvent } from "solid-js/web";
import { appPath } from "~/lib/router/app-path";
import { fail } from "./http.server";
import { preparedAccounts, readSession } from "./sessions.server";

export function currentRequest() {
  const event = getRequestEvent();
  if (!event) throw new Error("A request is required.");
  return event.request;
}
export function appOrigin() {
  const configured = process.env.APP_ORIGIN;
  try {
    const url = new URL(configured || "");
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== configured) throw new Error();
    return url.origin;
  } catch { return fail(503, "APP_ORIGIN must contain the canonical app origin."); }
}
export function requireOrigin(request: Request) {
  if (request.headers.get("origin") !== appOrigin()) fail(403, "This request came from another origin.");
}
export async function requireUser(request: Request) {
  const resolved = await readSession(request);
  if (!resolved) fail(401, "Sign in to continue.");
  return resolved.account;
}
export async function requireMutationUser(request: Request, expectedUserId?: FormDataEntryValue | null) {
  requireOrigin(request);
  const user = await requireUser(request);
  const expected = expectedUserId ?? request.headers.get("x-comic-user");
  if (expected !== user.id) fail(409, "The account changed. Reload this page before making changes.");
  return user;
}
export async function requireLegacyUser(request: Request, write = false) {
  if (write) requireOrigin(request);
  const user = await requireUser(request);
  const { state } = await preparedAccounts();
  if (user.id !== state.legacyUserId) fail(404, "Not found.");
  return user;
}
export function returnDestination(value: unknown) {
  const fallback = appPath("/books");
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  const url = new URL(value, appOrigin());
  if (url.origin !== appOrigin() || (url.pathname !== fallback && !url.pathname.startsWith(`${fallback}/`))) return fallback;
  return `${url.pathname}${url.search}`;
}
export async function requirePageUser() {
  const request = currentRequest();
  const resolved = await readSession(request);
  if (resolved) return resolved.account;
  const pathname = new URL(request.url).pathname;
  const url = new URL(appPath("/sign-in"), appOrigin());
  url.searchParams.set("returnTo", returnDestination(pathname));
  throw Response.redirect(url.href, 302);
}
