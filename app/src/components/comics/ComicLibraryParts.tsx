import { ComicArt, type ComicArtName } from "./ComicArt";

/** Deterministic cover color (0-4) so server and client renders match. */
export function coverTone(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return String(hash % 5);
}

const coverArtByTone: ComicArtName[] = ["book-open", "pow", "rocket-pencil", "books", "page-four"];

/** Each book gets its own sticker so covers are easy to tell apart. */
export function coverArt(id: string): ComicArtName {
  let hash = 7;
  for (let index = 0; index < id.length; index += 1) hash = (hash * 17 + id.charCodeAt(index)) >>> 0;
  return coverArtByTone[hash % coverArtByTone.length];
}

const updatedFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function formatUpdated(updatedAt: string) {
  const date = new Date(updatedAt);
  return Number.isNaN(date.getTime()) ? updatedAt.slice(0, 10) : updatedFormat.format(date);
}

export function LibraryEmptyState() {
  return (
    <section class="comic-library-empty" aria-labelledby="library-empty-title">
      <ComicArt name="rocket-pencil" size={150} class="comic-library-empty-art" />
      <h2 id="library-empty-title">No books yet!</h2>
      <p>Type a name for your first comic in the yellow box, then press Create New Book. Blast off!</p>
    </section>
  );
}
