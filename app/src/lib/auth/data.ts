import { action, query, redirect } from "@solidjs/router";

export const getCurrentAccount = query(async () => {
  "use server";
  const { currentRequest } = await import("./request.server");
  const { readSession } = await import("./sessions.server");
  return (await readSession(currentRequest()))?.account ?? null;
}, "current-account");

export const getPageAccount = query(async () => {
  "use server";
  const { requirePageUser } = await import("./request.server");
  return requirePageUser();
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
    const email = formData.get("email");
    const password = formData.get("password");
    if (typeof email !== "string" || typeof password !== "string") return { error: "Enter your email and password." };
    const user = await authenticate(email, password);
    if (!user) return { error: "Email or password is incorrect." };
    const { token } = await issueSession(user.id, request);
    setSessionCookie(token);
    destination = new URL(returnDestination(formData.get("returnTo")), appOrigin()).href;
  } catch (error) {
    return { error: error instanceof Response ? await error.text() : "Sign-in is unavailable. Try again later." };
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
    await requireMutationUser(request, formData.get("userId"));
    await revokeSession(request);
    clearSessionCookie();
  } catch (error) {
    return { error: error instanceof Response ? await error.text() : "Sign-out failed. Try again." };
  }
  throw redirect(new URL(appPath("/"), appOrigin()).href, 303);
}, "sign-out");
