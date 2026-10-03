import { getPageAccount } from "~/lib/auth/data";
import { createAsync, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import { ComicCreatorApp } from "~/components/comics/ComicCreatorApp";
import { getComicBookById } from "~/lib/comics/data";
import { PageMeta } from "~/lib/seo";

export default function ComicBookRoute() {
  const params = useParams();
  const account = createAsync(() => getPageAccount(), { deferStream: true });
  const book = createAsync(() => getComicBookById(params.bookId || ""), { deferStream: true });

  return (
    <Show when={account() && book()}>
      {(resolvedBook) => (
        <>
          <PageMeta
            title={`${resolvedBook().title} | Comic Book Creator`}
            description="Edit panels, text, templates, and print-ready pages for a saved comic book."
          />
          <ComicCreatorApp account={account()!} initialBook={resolvedBook()} />
        </>
      )}
    </Show>
  );
}
