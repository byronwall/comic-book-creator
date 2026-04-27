import { A } from "@solidjs/router";
import { Home } from "lucide-solid";

export function ComicAppNav() {
  return (
    <header class="comic-app-nav" aria-label="App navigation">
      <div class="comic-logo compact" aria-label="Comic Book Creator">
        <span>Comic</span>
        <strong>Creator</strong>
      </div>
      <nav class="comic-nav" aria-label="Comic book navigation">
        <A href="/" class="active" title="Book index">
          <span class="comic-nav-icon">
            <Home size={20} />
          </span>
          Books
        </A>
      </nav>
    </header>
  );
}
