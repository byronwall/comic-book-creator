import { createEffect, createSignal } from "solid-js";
import { SimpleDialog } from "~/components/ui/simple-dialog";

type ComicTitleRenameDialogProps = {
  open: boolean;
  title: string;
  onOpenChange: (open: boolean) => void;
  onRename: (title: string) => void;
};

export function ComicTitleRenameDialog(props: ComicTitleRenameDialogProps) {
  const [draftTitle, setDraftTitle] = createSignal("");
  let titleInput: HTMLInputElement | undefined;

  createEffect(() => {
    if (props.open) {
      setDraftTitle(props.title);
    }
  });

  const cleanTitle = () => draftTitle().trim();

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    const nextTitle = cleanTitle();
    if (!nextTitle) return;
    props.onRename(nextTitle);
    props.onOpenChange(false);
  }

  return (
    <SimpleDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      title="Rename your book"
      description="Give your comic a new title."
      maxW="520px"
      contentClass="comic-dialog"
      skipPortal
      initialFocusEl={() => titleInput ?? null}
    >
      <form method="dialog" onSubmit={handleSubmit} class="comic-dialog-form">
        <label class="comic-field">
          <span>Title</span>
          <input
            ref={titleInput}
            name="title"
            value={draftTitle()}
            onInput={(event) => setDraftTitle(event.currentTarget.value)}
            autocomplete="off"
            required
          />
        </label>
        <div class="comic-dialog-actions">
          <button type="button" class="comic-btn" onClick={() => props.onOpenChange(false)}>
            Cancel
          </button>
          <button type="submit" class="comic-btn primary" disabled={!cleanTitle()}>
            Save
          </button>
        </div>
      </form>
    </SimpleDialog>
  );
}
