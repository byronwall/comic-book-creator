import { readFile } from "node:fs/promises";
import type { APIEvent } from "@solidjs/start/server";
import { getComicBookImagePath, readComicBookByIdFromDisk } from "~/lib/comics/data.server";

const mimeTypes: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(event: APIEvent) {
  const book = await readComicBookByIdFromDisk(event.params.bookId);
  if (!book) return new Response("Not found", { status: 404 });

  try {
    const image = await readFile(getComicBookImagePath(book.id, event.params.filename));
    const extension = event.params.filename.split(".").pop()?.toLowerCase() ?? "";
    return new Response(new Uint8Array(image), {
      headers: {
        "content-type": mimeTypes[extension] ?? "application/octet-stream",
        "content-length": String(image.byteLength),
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
