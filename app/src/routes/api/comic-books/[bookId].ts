import type { APIEvent } from "@solidjs/start/server";
import { deleteComicBookOnDisk, readComicBookByIdFromDisk, writeComicBookByIdToDisk } from "~/lib/comics/data.server";

export async function GET(event: APIEvent) {
  const book = await readComicBookByIdFromDisk(event.params.bookId);

  if (!book) {
    return new Response("Not found", { status: 404 });
  }

  return json(book);
}

export async function PUT(event: APIEvent) {
  const payload = await event.request.json();
  const book = await writeComicBookByIdToDisk(event.params.bookId, payload);

  return json(book);
}

export async function DELETE(event: APIEvent) {
  await deleteComicBookOnDisk(event.params.bookId);

  return new Response(null, {
    status: 204,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function json(value: unknown) {
  return new Response(JSON.stringify(value), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
