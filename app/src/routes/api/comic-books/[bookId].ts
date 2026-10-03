import type { APIEvent } from "@solidjs/start/server";
import { requireMutationUser, requireUser } from "~/lib/auth/request.server";
import { apiResponse, fail, privateJson } from "~/lib/auth/http.server";
import { deleteComicBookOnDisk, readComicBookByIdFromDisk, writeComicBookByIdToDisk } from "~/lib/comics/data.server";

export function GET(event: APIEvent) {
  return apiResponse(async () => {
    const user = await requireUser(event.request);
    const book = await readComicBookByIdFromDisk(user.id, event.params.bookId);
    if (!book) return fail(404, "Not found");
    return privateJson(book);
  });
}

export function PUT(event: APIEvent) {
  return apiResponse(async () => {
    const user = await requireMutationUser(event.request);
    let payload: unknown;
    try { payload = await event.request.json(); } catch { return fail(400, "Invalid request body"); }
    const book = await writeComicBookByIdToDisk(user.id, event.params.bookId, payload);
    if (!book) return fail(404, "Not found");
    return privateJson(book);
  });
}

export function DELETE(event: APIEvent) {
  return apiResponse(async () => {
    const user = await requireMutationUser(event.request);
    if (!await deleteComicBookOnDisk(user.id, event.params.bookId)) return fail(404, "Not found");
    return new Response(null, { status: 204, headers: { "cache-control": "private, no-store" } });
  });
}
