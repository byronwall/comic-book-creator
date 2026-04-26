import { A, revalidate } from "@solidjs/router";
import { BookOpen, FilePlus2, Home, Trash2 } from "lucide-solid";
import { For, createSignal } from "solid-js";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { getComicBooks } from "~/lib/comics/data";
import type { ComicBookSummary } from "~/lib/comics/types";
import { PrintActions } from "./ComicPrintActions";
import "./comic-creator.css";

export function ComicBookIndexPage(props: { books: ComicBookSummary[] }) {
  const [title, setTitle] = createSignal("Untitled Comic Book");
  const [deleteBookId, setDeleteBookId] = createSignal("");
  const [deleteDialogOpen, setDeleteDialogOpen] = createSignal(false);
  const [deletePendingBookId, setDeletePendingBookId] = createSignal("");
  const [deleteError, setDeleteError] = createSignal("");

  const pendingDeleteBook = () => props.books.find((book) => book.id === deleteBookId());
  const isDeleting = () => Boolean(deletePendingBookId());
  const deleteBook = async (bookId: string) => {
    setDeletePendingBookId(bookId);
    setDeleteError("");

    try {
      const response = await fetch(`/api/comic-books/${encodeURIComponent(bookId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}.`);
      }

      await revalidate(getComicBooks.key);
      setDeleteBookId("");
    } catch (error) {
      console.error(error);
      setDeleteError("The book could not be deleted. Try again.");
      setDeleteDialogOpen(true);
    } finally {
      setDeletePendingBookId("");
    }
  };

  return (
    <div class="comic-app">
      <aside class="comic-sidebar" aria-label="App navigation">
        <div class="comic-logo" aria-label="Comic Book Creator">
          <span>Comic Book</span>
          <strong>Creator</strong>
        </div>
        <nav class="comic-nav">
          <A href="/" class="active">
            <span class="comic-nav-icon">
              <Home size={21} />
            </span>
            Index
          </A>
        </nav>
      </aside>

      <main class="comic-main">
        <header class="comic-topbar">
          <div>
            <h1>My Books</h1>
            <p>Open a saved comic book or start a new one.</p>
          </div>
        </header>

        <section class="comic-books-index">
          <div class="comic-book-grid">
            <For each={props.books}>
              {(book) => (
                <article class="comic-book-card">
                  <A href={`/books/${book.id}`} class="comic-book-card-link">
                    <span class="comic-book-cover">
                      <BookOpen size={52} />
                    </span>
                    <strong>{book.title}</strong>
                    <span>{book.pageCount} pages</span>
                    <small>Updated {new Date(book.updatedAt).toLocaleDateString()}</small>
                  </A>
                  <button
                    type="button"
                    class="comic-book-delete-button"
                    aria-label={`Delete ${book.title}`}
                    title={`Delete ${book.title}`}
                    disabled={isDeleting()}
                    onClick={() => {
                      setDeleteError("");
                      setDeleteBookId(book.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                </article>
              )}
            </For>
          </div>

          <form
            method="post"
            action="/api/comic-books"
            class="comic-card comic-create-book"
          >
            <h2>Create New Book</h2>
            <label class="comic-field">
              <span>Book Title</span>
              <input
                name="title"
                value={title()}
                onInput={(event) => setTitle(event.currentTarget.value)}
              />
            </label>
            <button
              type="submit"
              class="comic-btn primary"
            >
              <FilePlus2 size={18} /> Create New Book
            </button>
          </form>
        </section>
        <PrintActions />
      </main>
      <ConfirmDialog
        open={deleteDialogOpen() && Boolean(pendingDeleteBook())}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open && !isDeleting()) {
            setDeleteBookId("");
            setDeleteError("");
          }
        }}
        title="Delete this book?"
        description={`This will permanently remove "${pendingDeleteBook()?.title ?? "this book"}" and all of its pages.`}
        confirmLabel={isDeleting() ? "Deleting..." : "Delete Book"}
        onConfirm={() => {
          const bookId = deleteBookId();
          if (!bookId) {
            return;
          }
          setDeleteDialogOpen(false);
          void deleteBook(bookId);
        }}
      >
        {deleteError() ? <p class="comic-dialog-error">{deleteError()}</p> : null}
      </ConfirmDialog>
    </div>
  );
}
