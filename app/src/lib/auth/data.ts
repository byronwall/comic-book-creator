import { action, query, redirect } from "@solidjs/router";

export const getCurrentAccount = query(async () => {
  "use server";
  const { currentRequest } = await import("./request.server");
  const { readSession } = await import("./sessions.server");
  const account = (await readSession(currentRequest()))?.account;
  const { isAdminUsername } = await import("~/lib/admin/access.server");
  return account ? { ...account, isAdmin: isAdminUsername(account.username) } : null;
}, "current-account");

export const getPageAccount = query(async () => {
  "use server";
  const { requirePageUser } = await import("./request.server");
  const account = await requirePageUser();
  const { isAdminUsername } = await import("~/lib/admin/access.server");
  return { ...account, isAdmin: isAdminUsername(account.username) };
}, "page-account");

export const signIn = action(async (formData: FormData) => {
  "use server";
  const { currentRequest, requireOrigin, appOrigin, returnDestination } = await import("./request.server");
  const { authenticate } = await import("./login.server");
  const { issueSession, setSessionCookie } = await import("./sessions.server");
  let destination: string;
  try {
    const request = currentRequest();
    requireOrigin(request);
    const username = formData.get("username");
    const password = formData.get("password");
    if (typeof username !== "string" || typeof password !== "string") return { error: "Type your username and password." };
    const user = await authenticate(username, password);
    if (!user) return { error: "That username and password don't match. Check them and try again." };
    const { token } = await issueSession(user.id, request, user.passwordHash);
    setSessionCookie(token);
    const { recordActivity } = await import("~/lib/admin/activity.server");
    await recordActivity({ type: "account.signed-in", userId: user.id });
    destination = new URL(returnDestination(formData.get("returnTo")), appOrigin()).href;
  } catch (error) {
    return { error: error instanceof Response ? await error.text() : "Signing in isn't working right now. Try again in a little while." };
  } finally {
    // SolidStart includes form input in its no-JavaScript flash response.
    formData.delete("password");
  }
  throw redirect(destination, 303);
}, "sign-in");

export const signOut = action(async (formData: FormData) => {
  "use server";
  const { currentRequest, requireMutationUser, appOrigin } = await import("./request.server");
  const { revokeSession, clearSessionCookie } = await import("./sessions.server");
  const { appPath } = await import("~/lib/router/app-path");
  try {
    const request = currentRequest();
    const account = await requireMutationUser(request, formData.get("userId"));
    const { recordActivity } = await import("~/lib/admin/activity.server");
    await revokeSession(request);
    clearSessionCookie();
    await recordActivity({ type: "account.signed-out", userId: account.id });
  } catch (error) {
    return { error: error instanceof Response ? await error.text() : "Signing out didn't work. Try again." };
  }
  throw redirect(new URL(appPath("/"), appOrigin()).href, 303);
}, "sign-out");

export const signUp = action(async (formData: FormData) => {
  "use server";
  const { currentRequest, requireOrigin, appOrigin } = await import("./request.server");
  const { registerAccount } = await import("./register.server");
  const { issueSession, setSessionCookie } = await import("./sessions.server");
  const { appPath } = await import("~/lib/router/app-path");
  let accountCreated = false;
  try {
    const request = currentRequest();
    requireOrigin(request);
    const username = formData.get("username");
    const password = formData.get("password");
    if (typeof username !== "string" || typeof password !== "string") return { error: "Type a username and password.", accountCreated };
    const user = await registerAccount(username, password);
    accountCreated = true;
    const { token } = await issueSession(user.id, request, user.passwordHash);
    setSessionCookie(token);
  } catch (error) {
    const message = accountCreated
      ? "Your account is ready, but we couldn't sign you in. Remember your password and use the Sign in page."
      : error instanceof Response ? await error.text() : "Making new accounts isn't working right now. Try again in a little while.";
    return { error: message, accountCreated };
  } finally {
    formData.delete("password");
  }
  throw redirect(new URL(appPath("/books"), appOrigin()).href, 303);
}, "sign-up");
