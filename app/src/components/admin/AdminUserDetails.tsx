import { createEffect, createSignal, Show } from "solid-js";
import { useSubmission } from "@solidjs/router";
import { manageUser } from "~/lib/admin/data";
import type { AdminUser } from "~/lib/admin/types";
import { normalizeActionUrl } from "~/lib/router/action-url";
import { formatBytes, formatDate } from "./format";

export function AdminUserDetails(props: { user: AdminUser; actorId: string; onClose: () => void; onResult: (message: string, failed: boolean) => void; onRefresh: () => void }) {
  const [operation, setOperation] = createSignal("password-reset");
  const [feedback, setFeedback] = createSignal("");
  const [failed, setFailed] = createSignal(false);
  const submission = useSubmission(manageUser);
  let form: HTMLFormElement | undefined;
  const self = () => props.user.id === props.actorId || props.user.isAdmin;
  createEffect(() => {
    props.user.id;
    props.user.disabled;
    setOperation("password-reset");
    setFeedback("");
    form?.reset();
  });
  createEffect(() => {
    const result = submission.result;
    if (!result) return;
    setFailed("error" in result);
    setFeedback("error" in result ? result.error : result.message);
    props.onResult("error" in result ? result.error : result.message, "error" in result);
    setOperation("password-reset");
    form?.reset();
    submission.clear();
    props.onRefresh();
  });
  const explanation = () => operation() === "delete"
    ? "Delete this account, all its books, and all stored photos. This cannot be undone. Activity records will remain."
    : operation() === "disable" ? "Stop sign-in and end all sessions. Saved books and photos will remain."
    : operation() === "enable" ? "Allow this user to sign in again. Their old sessions stay signed out."
    : "Set a new password and end all sessions. Share the password with the user yourself. If this is your account, sign in again afterward.";
  return (
    <section class="admin-panel admin-details" aria-labelledby="admin-user-title">
      <div class="admin-section-heading">
        <div><h2 id="admin-user-title">{props.user.username}</h2><p>Joined {formatDate(props.user.createdAt)} · {props.user.disabled ? "Disabled" : "Enabled"}</p></div>
        <button class="comic-btn" type="button" onClick={() => props.onClose()} disabled={submission.pending}>Close details</button>
      </div>
      <dl class="admin-stat-strip">
        <div><dt>Books</dt><dd>{props.user.books}</dd></div><div><dt>Pages</dt><dd>{props.user.pages}</dd></div>
        <div><dt>Pages with photos</dt><dd>{props.user.photoPages}</dd></div><div><dt>Pages with text</dt><dd>{props.user.textPages}</dd></div>
        <div><dt>Photo placements</dt><dd>{props.user.photos}</dd></div><div><dt>Library storage</dt><dd>{formatBytes(props.user.bytes)}</dd></div>
      </dl>
      <p class="admin-note">Library storage includes book files, uploaded photos, and crop originals. Book content stays private.</p>
      <form ref={form} method="post" action={normalizeActionUrl(manageUser.toString())} class="admin-account-form" onSubmit={() => setFeedback("")}>
        <input type="hidden" name="userId" value={props.actorId} /><input type="hidden" name="targetUserId" value={props.user.id} />
        <fieldset disabled={submission.pending}>
          <legend>Manage account</legend>
          <label>Action<select name="operation" value={operation()} onChange={(event) => { setOperation(event.currentTarget.value); setFeedback(""); }}>
            <option value="password-reset">Reset password</option>
            <Show when={!self()}><option value={props.user.disabled ? "enable" : "disable"}>{props.user.disabled ? "Enable account" : "Disable account"}</option><option value="delete">Delete account and library</option></Show>
          </select></label>
          <p id="admin-action-description">{explanation()}</p>
          <Show when={operation() === "password-reset"}>
            <label>New password<input type="password" name="password" required minlength="6" maxlength="128" autocomplete="new-password" aria-describedby="admin-action-description" /></label>
          </Show>
          <Show when={operation() === "delete"}>
            <label>Type <strong>{props.user.username}</strong> to confirm<input name="confirmUsername" required autocomplete="off" spellcheck={false} aria-describedby="admin-action-description" /></label>
          </Show>
          <label class="admin-confirm"><input type="checkbox" required name="confirmed" value="yes" />I understand the effect of this action.</label>
          <button type="submit" class="comic-btn" classList={{ "danger-solid": operation() === "delete", primary: operation() !== "delete" }}>
            {submission.pending ? "Updating account…" : operation() === "delete" ? "Delete account and library" : operation() === "disable" ? "Disable account" : operation() === "enable" ? "Enable account" : "Reset password"}
          </button>
        </fieldset>
      </form>
      <Show when={feedback()}><p role={failed() ? "alert" : "status"} classList={{ "account-error": failed(), "admin-success": !failed() }}>{feedback()}</p></Show>
    </section>
  );
}
