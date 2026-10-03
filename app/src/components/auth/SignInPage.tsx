import { A, useSearchParams, useSubmission } from "@solidjs/router";
import { Show } from "solid-js";
import * as Field from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { signIn } from "~/lib/auth/data";
import { normalizeActionUrl } from "~/lib/router/action-url";
import "~/components/comics/comic-creator.css";
import "./accounts.css";

export function SignInPage() {
  const submission = useSubmission(signIn);
  const [params] = useSearchParams();
  return (
    <main class="account-page">
      <A href="/" class="account-brand" aria-label="Comic Book Creator home">Comic Creator</A>
      <section class="account-form-panel" aria-labelledby="account-heading">
        <h1 id="account-heading">Welcome back.</h1>
        <p>Sign in to open your comic books.</p>
        <form method="post" action={normalizeActionUrl(signIn.toString())} class="account-form">
          <input type="hidden" name="returnTo" value={typeof params.returnTo === "string" ? params.returnTo : ""} />
          <Field.Root required>
            <Field.Label>Email</Field.Label>
            <Input name="email" type="email" autocomplete="email" required maxlength={254} aria-describedby="account-error" />
          </Field.Root>
          <Field.Root required>
            <Field.Label>Password</Field.Label>
            <Input name="password" type="password" autocomplete="current-password" required maxlength={128} aria-describedby="account-error" />
          </Field.Root>
          <p id="account-error" class="account-error" role="alert">{submission.result?.error || (submission.error ? "Sign-in failed. Try again." : "")}</p>
          <button class="comic-btn primary" type="submit" disabled={submission.pending}>
            {submission.pending ? "Signing in…" : "Sign in"}
          </button>
          <Show when={submission.pending}><p role="status">Opening your library…</p></Show>
        </form>
      </section>
    </main>
  );
}
