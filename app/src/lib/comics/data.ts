import { action, query, redirect } from "@solidjs/router";

export const getComicBooks = query(async () => {
  "use server";
  const { requirePageUser } = await import("~/lib/auth/request.server");
  const { readComicBookSummariesFromDisk } = await import("./data.server");
  const user = await requirePageUser();
  return readComicBookSummariesFromDisk(user.id);
}, "comic-books");

export const getComicBookById = query(async (bookId: string) => {
  "use server";
  const { requirePageUser } = await import("~/lib/auth/request.server");
  const { readComicBookByIdFromDisk } = await import("./data.server");
  const user = await requirePageUser();
  const book = await readComicBookByIdFromDisk(user.id, bookId);
  if (!book) throw new Response("Book not found.", { status: 404 });
  return book;
}, "comic-book-by-id");

export const createComicBook = action(async (formData: FormData) => {
  "use server";
  const { currentRequest, requireMutationUser, appOrigin } = await import("~/lib/auth/request.server");
  const { appPath } = await import("~/lib/router/app-path");
  const { createComicBookOnDisk } = await import("./data.server");
  let destination: string;
  try {
    const user = await requireMutationUser(currentRequest(), formData.get("userId"));
    const title = formData.get("title");
    const book = await createComicBookOnDisk(user.id, { title: typeof title === "string" ? title : undefined });
    destination = new URL(appPath(`/books/${book.id}`), appOrigin()).href;
  } catch (error) {
    return { error: error instanceof Response ? await error.text() : "Could not create this book. Try again." };
  }
  throw redirect(destination, 303);
}, "create-comic-book");
