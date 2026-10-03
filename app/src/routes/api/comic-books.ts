import type { APIEvent } from "@solidjs/start/server";
import { requireMutationUser, requireUser } from "~/lib/auth/request.server";
import { apiResponse, fail, privateJson } from "~/lib/auth/http.server";
import { appPath } from "~/lib/router/app-path";
import { createComicBookOnDisk, readComicBookSummariesFromDisk } from "~/lib/comics/data.server";

export function GET(event: APIEvent) {
  return apiResponse(async () => {
    const user = await requireUser(event.request);
    return privateJson(await readComicBookSummariesFromDisk(user.id));
  });
}

export function POST(event: APIEvent) {
  return apiResponse(async () => {
    const isJson = (event.request.headers.get("content-type") || "").includes("application/json");
    let title: string | undefined;
    let expectedUserId: FormDataEntryValue | null = null;
    if (isJson) {
      let payload: unknown;
      try { payload = await event.request.json(); } catch { return fail(400, "Invalid request body"); }
      if (!payload || typeof payload !== "object") return fail(400, "Invalid request body");
      title = typeof (payload as { title?: unknown }).title === "string" ? (payload as { title: string }).title : undefined;
    } else {
      let form: FormData;
      try { form = await event.request.formData(); } catch { return fail(400, "Invalid form data"); }
      const formTitle = form.get("title");
      title = typeof formTitle === "string" ? formTitle : undefined;
      expectedUserId = form.get("userId");
      if (typeof expectedUserId !== "string") return fail(400, "Account context is required");
    }
    const user = await requireMutationUser(event.request, expectedUserId);
    const book = await createComicBookOnDisk(user.id, { title });
    if (!isJson) return Response.redirect(new URL(appPath(`/books/${book.id}`), event.request.url), 303);
    return privateJson(book, 201);
  });
}
