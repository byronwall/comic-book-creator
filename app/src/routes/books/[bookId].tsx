import { getPageAccount } from "~/lib/auth/data";
import { createAsync, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import { ComicCreatorApp } from "~/components/comics/ComicCreatorApp";
import { ComicBookUnavailable } from "~/components/comics/ComicBookUnavailable";
import { getComicBookById } from "~/lib/comics/data";
import { PageMeta } from "~/lib/seo";

export default function ComicBookRoute() {
  const params = useParams();
  const account = createAsync(() => getPageAccount(), { deferStream: true });
  const book = createAsync(() => getComicBookById(params.bookId || ""), { deferStream: true });

  return (
    <Show keyed when={params.bookId}>
      {(bookId) => <Show when={account()}>
      {(resolvedAccount) => <Show when={book()?.id === bookId ? book() : null}
        fallback={<Show when={book() === null}><ComicBookUnavailable account={resolvedAccount()} /></Show>}>
      {(resolvedBook) => (
        <>
          <PageMeta
            title={`${resolvedBook().title} | ComicBam`}
            description="Edit panels, text, templates, and print-ready pages for a saved comic book."
          />
          <ComicCreatorApp account={resolvedAccount()} initialBook={resolvedBook()} />
        </>
      )}
      </Show>}
      </Show>}
    </Show>
  );
}
