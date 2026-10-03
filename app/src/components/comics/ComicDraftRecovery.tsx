import type { DraftPause } from "./comic-draft-queue";
import "./comic-draft-recovery.css";

export function ComicDraftRecovery(props: {
  pause: DraftPause | undefined;
  accountChanged: boolean;
  signInHref: string;
  uploading: boolean;
  leavePending: boolean;
  onDownload: () => void;
  onCheckResume: () => void;
  onReload: () => void;
  onDiscardAndLeave: () => void;
  onSaveAndContinue: () => void;
  onStay: () => void;
}) {
  const title = () => props.pause === "conflict" ? "This book changed elsewhere"
    : props.uploading ? "Photo upload in progress"
      : props.accountChanged ? "Account changed"
        : props.leavePending ? "Finish before leaving" : "Draft needs attention";
  const message = () => {
    if (props.pause === "conflict") return "A newer version is saved. Download your draft or reload the saved version. Saving is paused.";
    if (props.uploading) return "The upload is still running. Wait here, or cancel it and discard the draft before continuing.";
    if (props.accountChanged) return "This tab belongs to another account. Your draft stays here. Download it before you leave.";
    if (props.pause === "expired") return "Your sign-in expired. Sign in again in another tab, then check this book before saving.";
    if (props.pause === "account") return "This tab no longer matches the signed-in account. Your draft is still available to download.";
    if (props.leavePending) return "The upload finished. Save the draft before leaving, or discard it and continue.";
    return "The save did not reach the server. Your draft is still available to download.";
  };
  return (
    <section class="comic-draft-recovery" aria-live="polite">
      <h2>{title()}</h2>
      <p>{message()}</p>
      <div class="comic-draft-actions">
        <button type="button" class="comic-btn" onClick={() => props.onDownload()}>Download draft JSON</button>
        {props.accountChanged || props.pause === "expired"
          ? <a class="comic-btn" href={props.signInHref} target="_blank" rel="noreferrer">Sign in in another tab</a>
          : null}
        {props.pause === "conflict" ? <button type="button" class="comic-btn" onClick={() => props.onReload()}>Reload saved version</button> : null}
        {props.pause && props.pause !== "conflict"
          ? <button type="button" class="comic-btn" onClick={() => props.onCheckResume()}>Check and resume</button>
          : null}
        {props.leavePending ? <>
          {!props.uploading ? <button type="button" class="comic-btn primary" onClick={() => props.onSaveAndContinue()}>Save and continue</button> : null}
          <button type="button" class="comic-btn danger" onClick={() => props.onDiscardAndLeave()}>{props.uploading ? "Cancel upload, discard draft, and continue" : "Discard draft and continue"}</button>
          <button type="button" class="comic-btn" onClick={() => props.onStay()}>Stay here</button>
        </> : null}
      </div>
    </section>
  );
}
