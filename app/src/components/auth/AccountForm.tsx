import { A, useSearchParams, useSubmission } from "@solidjs/router";
import { Show, untrack } from "solid-js";
import * as Field from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { signIn, signUp } from "~/lib/auth/data";
import { normalizeActionUrl } from "~/lib/router/action-url";
import "~/components/comics/comic-creator.css";
import "./accounts.css";

export function AccountForm(props: { mode: "sign-in" | "sign-up" }) {
  const signup = () => props.mode === "sign-up";
  const selectedAction = untrack(() => props.mode === "sign-up" ? signUp : signIn);
  const submission = useSubmission(selectedAction);
  const [params] = useSearchParams();
  const created = () => Boolean(submission.result && "accountCreated" in submission.result && submission.result.accountCreated);
  return (
    <main class="account-page">
      <A href="/" class="comic-logo" aria-label="Comic Book Creator home"><span>Comic</span><strong>Creator</strong></A>
      <section class="account-form-panel" aria-labelledby="account-heading">
        <h1 id="account-heading">{signup() ? "Your stories start here!" : "Welcome back!"}</h1>
        <p>{signup() ? "Create a private library for your comic books." : "Sign in to open your comic books."}</p>
        <form method="post" action={normalizeActionUrl(selectedAction.toString())} class="account-form">
          <input type="hidden" name="returnTo" value={typeof params.returnTo === "string" ? params.returnTo : ""} />
          <Field.Root required>
            <Field.Label>User name</Field.Label>
            <Input name="username" type="text" autocomplete="username" required maxlength={40} pattern="[A-Za-z0-9][A-Za-z0-9._-]{0,39}" aria-describedby="username-help account-error" />
            <Field.HelperText id="username-help">Use 1–40 letters, numbers, dots, dashes, or underscores. Start with a letter or number.</Field.HelperText>
          </Field.Root>
          <Field.Root required>
            <Field.Label>Password</Field.Label>
            <Input name="password" type="password" autocomplete={signup() ? "new-password" : "current-password"}
              required minlength={signup() ? 6 : undefined} aria-describedby={signup() ? "password-help account-error" : "account-error"} />
            <Show when={signup()}><Field.HelperText id="password-help">Use at least 6 characters. No other password rules apply. Password resets are not available yet.</Field.HelperText></Show>
          </Field.Root>
          <p id="account-error" class="account-error" role="alert">{submission.result?.error || (submission.error ? "The request failed. Try again." : "")}</p>
          <button class="comic-btn primary" type="submit" disabled={submission.pending || created()}>
            {submission.pending ? "Please wait…" : signup() ? "Create account" : "Sign in"}
          </button>
          <Show when={created()}><A href="/sign-in">Sign in to your new account</A></Show>
        </form>
        <p class="account-switch">{signup() ? "Already have an account? " : "New here? "}<A href={signup() ? "/sign-in" : "/sign-up"}>{signup() ? "Sign in" : "Create an account"}</A></p>
      </section>
    </main>
  );
}
