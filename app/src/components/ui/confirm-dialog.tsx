import { Show, type JSX } from "solid-js";
import { HStack, VStack } from "styled-system/jsx";
import { SimpleDialog } from "./simple-dialog";
import { Button } from "./button";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  children?: JSX.Element;
  /** "comic" renders the ComicBam themed dialog with comic-btn buttons. */
  appearance?: "comic";
  /** Marks the confirm action as destructive (red in the comic appearance). */
  destructive?: boolean;
};

export function ConfirmDialog(props: ConfirmDialogProps) {
  const confirmLabel = () => props.confirmLabel ?? "Confirm";
  const cancelLabel = () => props.cancelLabel ?? "Cancel";

  const handleConfirm = () => {
    props.onConfirm();
    props.onOpenChange(false);
  };

  const handleCancel = () => {
    props.onOpenChange(false);
  };

  return (
    <SimpleDialog
      open={props.open}
      onOpenChange={props.onOpenChange}
      onClose={handleCancel}
      title={props.title}
      description={props.description}
      maxW="480px"
      contentClass={props.appearance === "comic" ? "comic-dialog" : undefined}
      footer={
        <HStack justify="flex-end" gap="2" w="full">
          <Show
            when={props.appearance === "comic"}
            fallback={
              <>
                <Button variant="outline" onClick={handleCancel}>
                  {cancelLabel()}
                </Button>
                <Button variant="solid" onClick={handleConfirm}>
                  {confirmLabel()}
                </Button>
              </>
            }
          >
            <button type="button" class="comic-btn" onClick={handleCancel}>
              {cancelLabel()}
            </button>
            <button
              type="button"
              class="comic-btn"
              classList={{ "danger-solid": props.destructive, primary: !props.destructive }}
              onClick={handleConfirm}
            >
              {confirmLabel()}
            </button>
          </Show>
        </HStack>
      }
    >
      <VStack gap="4" alignItems="stretch">
        {props.children}
      </VStack>
    </SimpleDialog>
  );
}
