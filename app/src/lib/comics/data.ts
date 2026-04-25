import { query } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import type { ComicBook, ComicBookSummary } from "./types";

async function fetchJson<T>(pathname: string): Promise<T> {
  const requestEvent = getRequestEvent();
  const requestUrl = requestEvent?.request.url;
  const url = requestUrl
    ? new URL(pathname, requestUrl)
    : new URL(pathname, window.location.origin);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load ${pathname}: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const getComicBook = query(
  async () => fetchJson<ComicBook>("/api/comic-book"),
  "comic-book",
);

export const getComicBooks = query(
  async () => fetchJson<ComicBookSummary[]>("/api/comic-books"),
  "comic-books",
);

export const getComicBookById = query(
  async (bookId: string) => fetchJson<ComicBook>(`/api/comic-books/${bookId}`),
  "comic-book-by-id",
);
