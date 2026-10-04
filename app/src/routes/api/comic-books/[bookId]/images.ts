import { randomUUID } from "node:crypto";
import path from "node:path";
import type { APIEvent } from "@solidjs/start/server";
import { requireMutationUser } from "~/lib/auth/request.server";
import { apiResponse, fail, privateJson } from "~/lib/auth/http.server";
import { appPath } from "~/lib/router/app-path";
import { saveComicBookImage } from "~/lib/comics/data.server";
import type { ComicPageImage } from "~/lib/comics/types";

const extensions: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const maxBytes = 25 * 1024 * 1024;

export function POST(event: APIEvent) {
  return apiResponse(async () => {
    const user = await requireMutationUser(event.request);
    let form: FormData;
    try { form = await event.request.formData(); } catch { return fail(400, "Invalid form data"); }
    const file = form.get("image");
    if (!(file instanceof File)) return fail(400, "An image is required");
    const extension = extensions[file.type];
    if (!extension) return fail(400, "Use a JPEG, PNG, or WebP image");
    if (file.size > maxBytes) return fail(400, "Image must be 25 MB or smaller");
    const filename = `${randomUUID()}${extension}`;
    await saveComicBookImage(user.id, event.params.bookId, filename, file.type, new Uint8Array(await file.arrayBuffer()));
    const image: ComicPageImage = {
      id: `image-${randomUUID()}`,
      src: appPath(`/api/private/comic-books/${event.params.bookId}/images/${filename}`),
      filename,
      originalName: path.basename(file.name).slice(0, 180) || filename,
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
    return privateJson(image, 201);
  });
}
