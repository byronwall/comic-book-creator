import { A } from "@solidjs/router";
import { PageMeta } from "~/lib/seo";
import "~/components/auth/accounts.css";

export default function HomeRoute() {
  return <main class="account-page">
    <PageMeta title="Comic Book Creator" description="Make and print your own comic books." />
    <h1>Comic Book Creator</h1>
    <p>Make a story. Build a book. Print it.</p>
    <A href="/books">Open your comic books</A>
    <A href="/sign-in">Sign in</A>
  </main>;
}
