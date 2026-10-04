import type { Account } from "~/lib/auth/sessions.server";
import { watchAccountTabs } from "~/lib/auth/account-events";
import { appPath } from "~/lib/router/app-path";
import { normalizeActionUrl } from "~/lib/router/action-url";
import { A, revalidate, useSubmission } from "@solidjs/router";
import { ComicArt } from "./ComicArt";
import { For, Show, createSignal, onCleanup, onMount, untrack } from "solid-js";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { createComicBook, getComicBooks } from "~/lib/comics/data";
import type { ComicBookSummary } from "~/lib/comics/types";
import { ComicAppNav } from "./ComicAppNav";
import { LibraryEmptyState, coverArt, coverTone, formatUpdated } from "./ComicLibraryParts";
import "./comic-creator.css";

export function ComicBookIndexPage(props: { account: Account; books: ComicBookSummary[] }) {
  const account = untrack(() => props.account);
  const createSubmission = useSubmission(createComicBook);
  const [title, setTitle] = createSignal("Untitled Comic Book");
  const [deleteBookId, setDeleteBookId] = createSignal("");
  const [deleteDialogOpen, setDeleteDialogOpen] = createSignal(false);
  const [deletePendingBookId, setDeletePendingBookId] = createSignal("");
  const [deleteError, setDeleteError] = createSignal("");
  const [accountChanged, setAccountChanged] = createSignal(false);

  onMount(() => {
    let checking = false;
    const checkAccount = async () => {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch(appPath("/api/auth/session"), { cache: "no-store" });
        const session = response.ok ? await response.json() as { id?: string } | null : null;
        if (session?.id !== account.id) setAccountChanged(true);
      } catch { setAccountChanged(true); }
      finally { checking = false; }
    };
    const refresh = () => { void checkAccount(); };
    const stopWatching = watchAccountTabs(refresh);
    void checkAccount();
    onCleanup(() => {
      stopWatching();
    });
  });

  const pendingDeleteBook = () => props.books.find((book) => book.id === deleteBookId());
  const isDeleting = () => Boolean(deletePendingBookId());
  const deleteBook = async (bookId: string) => {
    setDeletePendingBookId(bookId);
    setDeleteError("");

    try {
      const response = await fetch(appPath(`/api/comic-books/${encodeURIComponent(bookId)}`), {
        method: "DELETE",
        headers: { "x-comic-user": account.id },
      });

      if (!response.ok) {
        throw new Error(`Delete failed with status ${response.status}.`);
      }

      await revalidate(getComicBooks.key);
      setDeleteBookId("");
    } catch (error) {
      console.error(error);
      setDeleteError("That book couldn't be deleted. Try again.");
      setDeleteDialogOpen(true);
    } finally {
      setDeletePendingBookId("");
    }
  };

  return (
    <div class="comic-app">
      <Show when={!accountChanged()}>
        <ComicAppNav account={account} />
      </Show>
      <Show when={accountChanged()}>
        <main class="comic-main comic-draft-recovery">
          <h1>You switched accounts</h1>
          <p>This page shows a different account's books. Reload the page after you sign in.</p>
          <a href={appPath("/sign-in")} target="_blank" rel="noreferrer">Sign in in another tab</a>
        </main>
      </Show>
      <Show when={!accountChanged()}>

      <main class="comic-main">
        <header class="comic-topbar">
          <div>
            <h1>My Books</h1>
            <p>Pick a book to keep working, or start a brand new one.</p>
          </div>
        </header>

        <section class="comic-books-index">
          <div>
          <Show when={props.books.length === 0}>
            <LibraryEmptyState />
          </Show>
          <div class="comic-book-grid">
            <For each={props.books}>
              {(book) => (
                <article class="comic-book-card">
                  <A href={`/books/${book.id}`} class="comic-book-card-link">
                    <span class="comic-book-cover" data-tone={coverTone(book.id)}>
                      <span class="comic-book-cover-burst">
                        <ComicArt name={coverArt(book.id)} size={72} />
                      </span>
                    </span>
                    <strong>{book.title}</strong>
                    <span class="comic-book-card-meta">
                      <span class="comic-book-pages">{book.pageCount === 1 ? "1 page" : `${book.pageCount} pages`}</span>
                      <span>Updated {formatUpdated(book.updatedAt)}</span>
                    </span>
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
                    <ComicArt name="trash" size={24} />
                  </button>
                </article>
              )}
            </For>
          </div>
          </div>

          <form
            method="post"
            action={normalizeActionUrl(createComicBook.toString())}
            class="comic-card comic-create-book"
          >
            <input type="hidden" name="userId" value={account.id} />
            <h2><ComicArt name="sparkle" size={34} /> Start a New Book</h2>
            <label class="comic-field">
              <span>Book title</span>
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
              <ComicArt name="page-add" size={28} /> {createSubmission.pending ? "Creating…" : "Create New Book"}
            </button>
            <p role="alert" class="account-error">{createSubmission.result?.error}</p>
          </form>
        </section>
      </main>
      <ConfirmDialog
        appearance="comic"
        destructive
        open={deleteDialogOpen() && Boolean(pendingDeleteBook())}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open && !isDeleting()) {
            setDeleteBookId("");
            setDeleteError("");
          }
        }}
        title="Delete this book?"
        description={`"${pendingDeleteBook()?.title ?? "This book"}" and all its pages will be gone forever. You can't undo this.`}
        confirmLabel={isDeleting() ? "Deleting…" : "Yes, delete it"}
        cancelLabel="Keep it"
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
      </Show>
    </div>
  );
}
