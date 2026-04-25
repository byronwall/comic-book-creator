import type { APIEvent } from "@solidjs/start/server";
import { createComicBookOnDisk, readComicBookSummariesFromDisk } from "~/lib/comics/data.server";

export async function GET(_event: APIEvent) {
  const books = await readComicBookSummariesFromDisk();

  return json(books);
}

export async function POST(event: APIEvent) {
  const contentType = event.request.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? ((await event.request.json().catch(() => ({}))) as { title?: string })
    : await readFormPayload(event.request);
  const book = await createComicBookOnDisk({ title: payload.title });

  if (!contentType.includes("application/json")) {
    return Response.redirect(new URL(`/books/${book.id}`, event.request.url), 303);
  }

  return json(book, 201);
}

async function readFormPayload(request: Request) {
  const formData = await request.formData();
  const title = formData.get("title");
  return { title: typeof title === "string" ? title : undefined };
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
