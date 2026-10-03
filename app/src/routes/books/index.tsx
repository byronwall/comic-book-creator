import { createAsync } from "@solidjs/router";
import { Show } from "solid-js";
import { ComicBookIndexPage } from "~/components/comics/ComicBookIndexPage";
import { getComicBooks } from "~/lib/comics/data";
import { getPageAccount } from "~/lib/auth/data";
import { PageMeta } from "~/lib/seo";

export default function LibraryRoute() {
  const account = createAsync(() => getPageAccount(), { deferStream: true });
  const books = createAsync(() => getComicBooks(), { deferStream: true });
  return <Show when={account()}>{(user) => <>
    <PageMeta title="My Comic Books" description="Your private comic book library." />
    <ComicBookIndexPage account={user()} books={books.latest ?? []} />
  </>}</Show>;
}
