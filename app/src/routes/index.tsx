import { ComicHomePage } from "~/components/comics/ComicHomePage";
import { PageMeta } from "~/lib/seo";

export default function HomeRoute() {
  return (
    <>
      <PageMeta
        title="Comic Book Creator"
        description="Index page for opening printable comic books and printing page templates for hand-drawn artwork."
      />
      <ComicHomePage />
    </>
  );
}
