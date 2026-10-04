import { A } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";
import type { Account } from "~/lib/auth/sessions.server";
import { PageMeta } from "~/lib/seo";
import { ComicAppNav } from "./ComicAppNav";
import "./comic-creator.css";

export function ComicBookUnavailable(props: { account: Account }) {
  return <div class="comic-app">
    <HttpStatusCode code={404} />
    <PageMeta title="Book not found | ComicBam" />
    <ComicAppNav account={props.account} />
    <main class="comic-main">
      <header class="comic-topbar"><div>
        <h1>Book not found</h1>
        <p>This book is not available in your account.</p>
      </div></header>
      <A href="/books" class="comic-btn primary">Go to my books</A>
    </main>
  </div>;
}
