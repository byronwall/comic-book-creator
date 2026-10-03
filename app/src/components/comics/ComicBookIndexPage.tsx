import type { Account } from "~/lib/auth/sessions.server";
import { appPath } from "~/lib/router/app-path";
import { normalizeActionUrl } from "~/lib/router/action-url";
import { A, revalidate, useSubmission } from "@solidjs/router";
import { BookOpen, FilePlus2, Trash2 } from "lucide-solid";
import { For, createSignal } from "solid-js";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { createComicBook, getComicBooks } from "~/lib/comics/data";
import type { ComicBookSummary } from "~/lib/comics/types";
import { ComicAppNav } from "./ComicAppNav";
import { PrintActions } from "./ComicPrintActions";
import "./comic-creator.css";

export function ComicBookIndexPage(props: { account: Account; books: ComicBookSummary[] }) {
  const createSubmission = useSubmission(createComicBook);
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
      const response = await fetch(appPath(`/api/comic-books/${encodeURIComponent(bookId)}`), {
        method: "DELETE",
        headers: { "x-comic-user": props.account.id },
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
      <ComicAppNav account={props.account} />

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
                    <small>Updated {book.updatedAt.slice(0, 10)}</small>
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
            action={normalizeActionUrl(createComicBook.toString())}
            class="comic-card comic-create-book"
          >
            <input type="hidden" name="userId" value={props.account.id} />
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
              disabled={createSubmission.pending}
              class="comic-btn primary"
            >
              <FilePlus2 size={18} /> {createSubmission.pending ? "Creating…" : "Create New Book"}
            </button>
            <p role="alert" class="account-error">{createSubmission.result?.error}</p>
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
