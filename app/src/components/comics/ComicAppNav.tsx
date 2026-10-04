import { A, useSubmission } from "@solidjs/router";
import { Home } from "lucide-solid";
import { signOut } from "~/lib/auth/data";
import type { Account } from "~/lib/auth/sessions.server";
import { normalizeActionUrl } from "~/lib/router/action-url";
import { untrack } from "solid-js";
import "~/components/auth/accounts.css";

export function ComicAppNav(props: { account: Account; onBeforeLeave?: (continueNavigation: () => void) => void }) {
  const account = untrack(() => props.account);
  const submission = useSubmission(signOut);
  return (
    <header class="comic-app-nav" aria-label="App navigation">
      <A href="/" class="comic-logo compact" aria-label="Comic Book Creator home" onClick={(event) => {
        if (props.onBeforeLeave && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) {
          event.preventDefault();
          const href = event.currentTarget.href;
          props.onBeforeLeave(() => window.location.assign(href));
        }
      }}>
        <span>Comic</span><strong>Creator</strong>
      </A>
      <nav class="comic-nav" aria-label="Comic book navigation">
        <A href="/books" class="active" title="Book index" onClick={(event) => {
          if (props.onBeforeLeave && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) {
            event.preventDefault();
            const href = event.currentTarget.href;
            props.onBeforeLeave(() => window.location.assign(href));
          }
        }}>
          <span class="comic-nav-icon"><Home size={20} /></span>Books
        </A>
      </nav>
      <div class="comic-account">
        <p>{account.email}</p>
        <form method="post" action={normalizeActionUrl(signOut.toString())} onSubmit={(event) => {
          if (props.onBeforeLeave) {
            event.preventDefault();
            const form = event.currentTarget;
            props.onBeforeLeave(() => form.submit());
          }
        }}>
          <input type="hidden" name="userId" value={account.id} />
          <button type="submit" class="comic-btn" disabled={submission.pending}>{submission.pending ? "Signing out…" : "Sign out"}</button>
          <p role="alert" class="account-error">{submission.result?.error}</p>
        </form>
      </div>
    </header>
  );
}
