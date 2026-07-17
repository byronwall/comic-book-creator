import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { APIEvent } from "@solidjs/start/server";
import { getComicBookImagePath, getComicBookImagesDir, readComicBookByIdFromDisk } from "~/lib/comics/data.server";
import type { ComicPageImage } from "~/lib/comics/types";

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const imageExtensions: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function POST(event: APIEvent) {
  const book = await readComicBookByIdFromDisk(event.params.bookId);
  if (!book) return new Response("Book not found", { status: 404 });

  const formData = await event.request.formData();
  const file = formData.get("image");
  if (!(file instanceof File)) return new Response("An image is required", { status: 400 });

  const extension = imageExtensions[file.type];
  if (!extension) return new Response("Use a JPEG, PNG, or WebP image", { status: 415 });
  if (file.size > MAX_IMAGE_BYTES) return new Response("Image must be 25 MB or smaller", { status: 413 });

  const filename = `${randomUUID()}${extension}`;
  await mkdir(getComicBookImagesDir(book.id), { recursive: true });
  await writeFile(getComicBookImagePath(book.id, filename), Buffer.from(await file.arrayBuffer()));

  const image: ComicPageImage = {
    id: `image-${randomUUID()}`,
    src: `/api/comic-books/${book.id}/images/${filename}`,
    filename,
    originalName: path.basename(file.name) || filename,
    mimeType: file.type,
    treatment: "grayscale",
    brightness: 105,
    contrast: 125,
    threshold: 58,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    rotation: 0,
    fit: "contain",
  };

  return new Response(JSON.stringify(image), {
    status: 201,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
