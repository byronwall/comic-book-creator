import { action, query } from "@solidjs/router";

export const getAdminSnapshot = query(async () => {
  "use server";
  const { currentRequest } = await import("~/lib/auth/request.server");
  const { requireAdmin } = await import("./access.server");
  const { readAdminSnapshot } = await import("./snapshot.server");
  return readAdminSnapshot(await requireAdmin(currentRequest()));
}, "admin-snapshot");

export const manageUser = action(async (formData: FormData) => {
  "use server";
  try {
    const { currentRequest } = await import("~/lib/auth/request.server");
    const { requireAdminMutation } = await import("./access.server");
    const { manageAccount } = await import("./accounts.server");
    const actor = await requireAdminMutation(currentRequest(), formData.get("userId"));
    return await manageAccount(actor, formData);
  } catch (error) {
    return { error: error instanceof Response ? await error.text()
      : "The action could not finish. Refresh the user table to check its state, then try again." };
  } finally {
    formData.delete("password");
  }
}, "admin-manage-user");
