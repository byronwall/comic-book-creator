import { normalizeUsername } from "~/lib/auth/users.server";
import { requireUser, requireMutationUser } from "~/lib/auth/request.server";
import { fail } from "~/lib/auth/http.server";

export function isAdminUsername(username: string) {
  const configured = normalizeUsername(process.env.ADMIN_USERNAME ?? "");
  return Boolean(configured) && normalizeUsername(username) === configured;
}

export async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  if (!isAdminUsername(user.username)) fail(403, "This page is only available to the site admin.");
  return user;
}

export async function requireAdminMutation(request: Request, expectedUserId: FormDataEntryValue | null) {
  const user = await requireMutationUser(request, expectedUserId);
  if (!isAdminUsername(user.username)) fail(403, "Only the site admin can manage accounts.");
  return user;
}
