import { A, useSubmission } from "@solidjs/router";
import { Home } from "lucide-solid";
import { signOut } from "~/lib/auth/data";
import type { Account } from "~/lib/auth/sessions.server";
import { normalizeActionUrl } from "~/lib/router/action-url";
import "~/components/auth/accounts.css";

export function ComicAppNav(props: { account: Account }) {
  const submission = useSubmission(signOut);
  return (
    <header class="comic-app-nav" aria-label="App navigation">
      <A href="/" class="comic-logo compact" aria-label="Comic Book Creator home">
        <span>Comic</span><strong>Creator</strong>
      </A>
      <nav class="comic-nav" aria-label="Comic book navigation">
        <A href="/books" class="active" title="Book index">
          <span class="comic-nav-icon"><Home size={20} /></span>Books
        </A>
      </nav>
      <div class="comic-account">
        <p>{props.account.email}</p>
        <form method="post" action={normalizeActionUrl(signOut.toString())}>
          <input type="hidden" name="userId" value={props.account.id} />
          <button type="submit" class="comic-btn" disabled={submission.pending}>{submission.pending ? "Signing out…" : "Sign out"}</button>
          <p role="alert" class="account-error">{submission.result?.error}</p>
        </form>
      </div>
    </header>
  );
}
