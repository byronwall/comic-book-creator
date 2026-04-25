import { A } from "@solidjs/router";
import { BookOpen, Home, Printer } from "lucide-solid";
import { PrintActions } from "./ComicPrintActions";
import "./comic-creator.css";

export function ComicHomePage() {
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
          <p>Every page keeps print controls at the bottom for quick paper drafts.</p>
        </section>
      </aside>

      <main class="comic-main">
        <header class="comic-topbar">
          <div>
            <h1>Index</h1>
            <p>Start from the book list, open a book, and print any page when it is ready.</p>
          </div>
        </header>

        <section class="comic-index-page">
          <A href="/books" class="comic-index-action">
            <BookOpen size={38} />
            <span>
              <strong>Books</strong>
              <small>Open saved comic books or create a new one.</small>
            </span>
          </A>
          <div class="comic-index-note">
            <Printer size={30} />
            <span>
              <strong>Print from any page</strong>
              <small>The bottom print option is available on the index, books, and book details pages.</small>
            </span>
          </div>
        </section>

        <PrintActions />
      </main>
    </div>
  );
}
