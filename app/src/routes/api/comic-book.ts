import type { APIEvent } from "@solidjs/start/server";
import { readComicBookFromDisk, writeComicBookToDisk } from "~/lib/comics/data.server";

export async function GET(_event: APIEvent) {
  const book = await readComicBookFromDisk();

  return json(book);
}

export async function PUT(event: APIEvent) {
  const payload = await event.request.json();
  const book = await writeComicBookToDisk(payload);

  return json(book);
}

function json(value: unknown) {
  return new Response(JSON.stringify(value), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
