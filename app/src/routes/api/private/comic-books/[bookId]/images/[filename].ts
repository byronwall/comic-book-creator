import type { APIEvent } from "@solidjs/start/server";
import { requireUser } from "~/lib/auth/request.server";
import { apiResponse } from "~/lib/auth/http.server";
import { readComicBookImage } from "~/lib/comics/data.server";

export function GET(event: APIEvent) {
  return apiResponse(async () => {
    const user = await requireUser(event.request);
    const image = await readComicBookImage(user.id, event.params.bookId, event.params.filename);
    if (!image) return new Response("Not found", { status: 404, headers: { "cache-control": "private, no-store" } });
    return new Response(new Uint8Array(image.bytes), {
      headers: {
        "content-type": image.mimeType,
        "content-length": String(image.bytes.byteLength),
        "cache-control": "private, no-store",
      },
    });
  });
}
