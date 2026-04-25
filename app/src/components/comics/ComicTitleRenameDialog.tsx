import { createEffect, createSignal } from "solid-js";
import { css } from "styled-system/css";
import { HStack, VStack } from "styled-system/jsx";
import { Button } from "~/components/ui/button";
import * as Field from "~/components/ui/field";
import { Input } from "~/components/ui/input";
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
      title="Rename Comic Book"
      description="Enter a new title for this comic book."
      maxW="520px"
      skipPortal
      initialFocusEl={() => titleInput ?? null}
    >
      <form
        method="dialog"
        onSubmit={handleSubmit}
        class={css({ width: "100%" })}
      >
        <VStack alignItems="stretch" gap="5" width="100%">
          <Field.Root required width="100%">
            <Field.Label>Title</Field.Label>
            <Input
              ref={titleInput}
              name="title"
              value={draftTitle()}
              onInput={(event) => setDraftTitle(event.currentTarget.value)}
              autocomplete="off"
              size="xl"
            />
          </Field.Root>

          <HStack justifyContent="stretch" gap="3" width="100%">
            <Button
              variant="outline"
              flex="1"
              minH="11"
              onClick={() => props.onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" flex="1" minH="11" disabled={!cleanTitle()}>
              Save
            </Button>
          </HStack>
        </VStack>
      </form>
    </SimpleDialog>
  );
}
