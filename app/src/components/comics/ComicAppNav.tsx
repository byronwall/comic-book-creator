import { A, useSubmission } from "@solidjs/router";
import { ComicArt } from "./ComicArt";
import { signOut } from "~/lib/auth/data";
import type { Account } from "~/lib/auth/sessions.server";
import { normalizeActionUrl } from "~/lib/router/action-url";
import { Show, untrack } from "solid-js";
import "~/components/auth/accounts.css";

export function ComicAppNav(props: { account: Account; onBeforeLeave?: (continueNavigation: () => void) => void }) {
  const account = untrack(() => props.account);
  const submission = useSubmission(signOut);
  return (
    <header class="comic-app-nav" aria-label="App navigation">
      <A href="/" class="comic-logo compact" aria-label="ComicBam home" onClick={(event) => {
        if (props.onBeforeLeave && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) {
          event.preventDefault();
          const href = event.currentTarget.href;
          props.onBeforeLeave(() => window.location.assign(href));
        }
      }}>
        <span>Comic</span><strong>Bam!</strong>
      </A>
      <nav class="comic-nav" aria-label="Comic book navigation">
        <A href="/books" activeClass="active" title="Book index" onClick={(event) => {
          if (props.onBeforeLeave && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) {
            event.preventDefault();
            const href = event.currentTarget.href;
            props.onBeforeLeave(() => window.location.assign(href));
          }
        }}>
          <ComicArt name="books" size={34} class="comic-nav-art" />My Books
        </A>
        <Show when={account.isAdmin}>
          <A href="/admin" activeClass="active" onClick={(event) => {
            if (props.onBeforeLeave && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) {
              event.preventDefault();
              const href = event.currentTarget.href;
              props.onBeforeLeave(() => window.location.assign(href));
            }
          }}>Admin</A>
        </Show>
      </nav>
      <div class="comic-account">
        <p class="comic-account-name" title={`Signed in as ${account.username}`}>
          <span class="comic-account-avatar" aria-hidden="true">{account.username.slice(0, 1).toUpperCase()}</span>
          <span class="comic-account-label">{account.username}</span>
        </p>
        <form method="post" action={normalizeActionUrl(signOut.toString())} onSubmit={(event) => {
          if (props.onBeforeLeave) {
            event.preventDefault();
            const form = event.currentTarget;
            props.onBeforeLeave(() => form.submit());
          }
        }}>
          <input type="hidden" name="userId" value={account.id} />
          <button type="submit" class="comic-btn comic-sign-out" disabled={submission.pending}><ComicArt name="sign-out" size={22} />{submission.pending ? "Signing out…" : "Sign out"}</button>
          <p role="alert" class="account-error">{submission.result?.error}</p>
        </form>
      </div>
    </header>
  );
}
