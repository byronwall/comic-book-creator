import { A } from "@solidjs/router";
import { BookOpen, FilePlus2, Home } from "lucide-solid";
import { For, createSignal } from "solid-js";
import type { ComicBookSummary } from "~/lib/comics/types";
import { PrintActions } from "./ComicPrintActions";
import "./comic-creator.css";

export function ComicBookIndexPage(props: { books: ComicBookSummary[] }) {
  const [title, setTitle] = createSignal("Untitled Comic Book");

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
        <section class="comic-sidebar-tip">
          <strong>Print your comic</strong>
          <p>Pick a book, add panels and words, then print the pages for hand-drawn art.</p>
        </section>
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
                <A href={`/books/${book.id}`} class="comic-book-card">
                  <span class="comic-book-cover">
                    <BookOpen size={52} />
                  </span>
                  <strong>{book.title}</strong>
                  <span>{book.pageCount} pages</span>
                  <small>Updated {new Date(book.updatedAt).toLocaleDateString()}</small>
                </A>
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
    </div>
  );
}
