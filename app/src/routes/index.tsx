import { createAsync } from "@solidjs/router";
import { ComicBookIndexPage } from "~/components/comics/ComicBookIndexPage";
import { getComicBooks } from "~/lib/comics/data";
import { PageMeta } from "~/lib/seo";

export default function HomeRoute() {
  const books = createAsync(() => getComicBooks());

  return (
    <>
      <PageMeta
        title="My Comic Books"
        description="Open a saved comic book or create a new printable comic book."
      />
      <ComicBookIndexPage books={books() ?? []} />
    </>
  );
}
