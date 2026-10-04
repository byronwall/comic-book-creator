import { A } from "@solidjs/router";
import { HttpStatusCode } from "@solidjs/start";
import type { Account } from "~/lib/auth/sessions.server";
import { PageMeta } from "~/lib/seo";
import { ComicAppNav } from "./ComicAppNav";
import { ComicArt } from "./ComicArt";
import "./comic-creator.css";

export function ComicBookUnavailable(props: { account: Account }) {
  return <div class="comic-app">
    <HttpStatusCode code={404} />
    <PageMeta title="Book not found | ComicBam" />
    <ComicAppNav account={props.account} />
    <main class="comic-main">
      <header class="comic-topbar"><div>
        <h1>Hmm, no book here</h1>
        <p>That book may have been deleted, or it belongs to a different account.</p>
      </div></header>
      <div class="comic-not-found"><ComicArt name="empty-page" size={220} />
      <A href="/books" class="comic-btn primary" end>Back to My Books</A></div>
    </main>
  </div>;
}
