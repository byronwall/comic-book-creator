import type { Account } from "~/lib/auth/sessions.server";
import { appPath } from "~/lib/router/app-path";
import { Camera, Check, Cloud, Eraser, MessageCircle, Pencil, Type, Zap } from "lucide-solid";
import { Show, createSignal, untrack } from "solid-js";
import type { ComicBook } from "~/lib/comics/types";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { ComicAppNav } from "./ComicAppNav";
import { ComicTitleRenameDialog } from "./ComicTitleRenameDialog";
import { ComicPaper } from "./ComicPaper";
import { ComicImageTools } from "./ComicImageTools";
import { ComicPhotoDeskewDialog } from "./ComicPhotoDeskewDialog";
import { PrintActions } from "./ComicPrintActions";
import { TemplatePicker } from "./ComicTemplatePicker";
import { ComicPageRail } from "./ComicPageRail";
import { TextToolsPanel } from "./ComicTextTools";
import { useComicImageUpload } from "./use-comic-image-upload";
import { ComicDraftRecovery } from "./ComicDraftRecovery";
import { useComicDraft } from "./use-comic-draft";
import { useComicBookEditor } from "./use-comic-book-editor";
import { useComicPasteImage } from "./use-comic-paste-image";
import { defaultPaperSize } from "./comic-paper-sizes";
import "./comic-creator.css";

export { PrintActions } from "./ComicPrintActions";

export function ComicCreatorApp(props: { account: Account; initialBook: ComicBook }) {
  const accountId = untrack(() => props.account.id);
  const editor = useComicBookEditor(props.initialBook);
  const {
    book, setBook, activePageId, setActivePageId, selectedTextId, setSelectedTextId, selectedImageId, setSelectedImageId,
    deleteTextId, setDeleteTextId, deletePageId, setDeletePageId, activePage, selectedText, selectedImage, selectedImageIndex,
    textPendingDelete, pagePendingDelete, setLayout, setPaperSize, addText, addPage, addImagePage, addImageLayer,
    updatePageImage, replaceImage, resetPageImage, moveSelectedImageLayer, selectText, selectImage, deselectObjects,
    selectPage, deletePage, moveActivePage, setPageCover, clearText, requestDeleteSelectedText, deleteText, renameBook,
    updateSelectedText, updateText,
  } = editor;
  const [renameOpen, setRenameOpen] = createSignal(false);
  const [deskewOpen, setDeskewOpen] = createSignal(false);
  const [clearTextConfirmOpen, setClearTextConfirmOpen] = createSignal(false);
  const imageUpload = useComicImageUpload({
    bookId: () => book().id,
    userId: accountId,
    onLayerImage: addImageLayer,
    onNewImage: addImagePage,
    onReplaceImage: replaceImage,
  });
  useComicPasteImage(imageUpload.upload);
  const draft = useComicDraft({
    initialBook: props.initialBook,
    accountId,
    book,
    setBook,
    onReload: (saved) => {
      const active = saved.pages.find((page) => page.id === activePageId()) ?? saved.pages[0];
      setActivePageId(active?.id ?? "");
      setSelectedTextId(active?.texts[0]?.id ?? "");
      setSelectedImageId(active?.texts[0] ? "" : active?.images?.[0]?.id ?? "");
    },
    uploadsBusy: () => imageUpload.state() === "uploading",
    cancelUploads: imageUpload.cancelAndWait,
  });

  return (
    <div class="comic-app">
      <input
        ref={imageUpload.setInputRef}
        class="comic-hidden-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void imageUpload.upload(file);
        }}
      />
      <Show when={!draft.accountChanged()}>
        <ComicAppNav account={props.account} onBeforeLeave={draft.beforeLeave} />
      </Show>
      <main class="comic-main">
      <Show when={draft.pause() || draft.accountChanged() || draft.leaveAction()}>
          <ComicDraftRecovery
            pause={draft.pause()}
            accountChanged={draft.accountChanged()}
            signInHref={appPath(`/sign-in?returnTo=${encodeURIComponent(appPath(`/books/${book().id}`))}`)}
            uploading={imageUpload.state() === "uploading"}
            leavePending={Boolean(draft.leaveAction())}
            onDownload={draft.downloadDraft}
            onCheckResume={() => void draft.checkAndResume()}
            onReload={draft.reloadSavedBook}
            onDiscardAndLeave={draft.discardAndLeave}
            onSaveAndContinue={draft.saveAndContinue}
            onStay={draft.stay}
          />
      </Show>
      <Show when={!draft.accountChanged()}>
        <header class="comic-topbar">
          <div>
            <div class="comic-title-row">
              <h1>{book().title}</h1>
              <button
                type="button"
                class="comic-title-edit-button"
                aria-label="Rename comic book"
                title="Rename comic book"
                onClick={() => setRenameOpen(true)}
              >
                <Pencil size={18} />
              </button>
            </div>
            <p>Build pages or photograph hand-drawn pages, then print them as a folded booklet.</p>
          </div>
          <div class="comic-save-status" data-state={draft.saveState()} aria-live="polite">
            <Show when={draft.saveState() === "saved"} fallback={draft.saveState() === "saving" ? "Saving..." : "Save failed"}>
              <Check size={17} /> All saved
            </Show>
          </div>
        </header>
        <ComicTitleRenameDialog
          open={renameOpen()}
          title={book().title}
          onOpenChange={setRenameOpen}
          onRename={renameBook}
        />
        <Show when={selectedImage()}>
          {(image) => <ComicPhotoDeskewDialog
            open={deskewOpen()}
            image={image()}
            onOpenChange={setDeskewOpen}
            onSave={async (file, corners) => {
              const uploaded = await imageUpload.upload(file, "processed");
              if (!uploaded) return false;
              updatePageImage({
                src: uploaded.src,
                filename: uploaded.filename,
                mimeType: uploaded.mimeType,
                crop: { sourceFilename: image().crop?.sourceFilename ?? image().filename, corners },
              });
              return true;
            }}
          />}
        </Show>
        <ConfirmDialog
          open={clearTextConfirmOpen()}
          onOpenChange={setClearTextConfirmOpen}
          title="Clear all text?"
          description="This will remove every text element from the current page."
          confirmLabel="Clear Text"
          onConfirm={clearText}
        />
        <ConfirmDialog
          open={Boolean(pagePendingDelete())}
          onOpenChange={(open) => !open && setDeletePageId("")}
          title="Delete this page?"
          description={`This will permanently remove "${pagePendingDelete()?.title ?? "this page"}" and its photo or text from the book.`}
          confirmLabel="Delete Page"
          onConfirm={() => {
            const pageId = deletePageId();
            if (pageId) deletePage(pageId);
          }}
        />
        <ConfirmDialog
          open={Boolean(textPendingDelete())}
          onOpenChange={(open) => !open && setDeleteTextId("")}
          title="Delete selected text?"
          description={`This will permanently remove "${textPendingDelete()?.text || "this text"}" from the current page.`}
          confirmLabel="Delete Text"
          onConfirm={() => {
            const textId = deleteTextId();
            if (textId) deleteText(textId);
          }}
        />

        <Show when={!draft.pause()}>
        <section class="comic-content">
          <ComicPageRail
            book={book()}
            activePageId={activePageId()}
            activeLayout={activePage()?.layout ?? "four"}
            activePaperSize={activePage()?.paperSize ?? defaultPaperSize}
            onSelect={selectPage}
            onAddPage={addPage}
            onAddImagePage={() => imageUpload.choose("new")}
            imageUploading={imageUpload.state() === "uploading"}
            onMoveActivePage={moveActivePage}
            onRequestDelete={setDeletePageId}
            onSetPageCover={setPageCover}
            onSelectLayout={setLayout}
            onSelectPaperSize={setPaperSize}
          />

          <Show
            when={activePage()?.mode === "image"}
            fallback={
              <TemplatePicker
                activeLayout={activePage()?.layout ?? "four"}
                activePaperSize={activePage()?.paperSize ?? defaultPaperSize}
                onSelect={setLayout}
                onSelectPaperSize={setPaperSize}
              />
            }
          >
            <aside class="comic-card comic-tools comic-photo-page-help">
              <h2>Photo Page</h2>
              <p class="comic-empty-note">Click the photo to select it. Drag it anywhere or resize it from a blue corner.</p>
              <p class="comic-image-hint">Photos layer in paste order and all stay behind every bubble and caption.</p>
              <p class="comic-image-hint"><strong>Tip:</strong> Paste with Cmd/Ctrl+V to add another independently editable photo layer.</p>
            </aside>
          </Show>

          <section class="comic-workspace">
            <div class="comic-card comic-toolbar edit-only">
              <div class="comic-tool-group">
                <button type="button" class="comic-btn tool-photo" onClick={() => imageUpload.choose("replace")}>
                  <span class="comic-btn-badge"><Camera size={16} /></span> {activePage()?.mode === "image" ? "Replace Photo" : "Use Photo"}
                </button>
                <button type="button" class="comic-btn tool-bubble" onClick={() => addText("speech")}>
                  <span class="comic-btn-badge"><MessageCircle size={16} /></span> Add Bubble
                </button>
                <button type="button" class="comic-btn tool-thought" onClick={() => addText("thought")}>
                  <span class="comic-btn-badge"><Cloud size={16} /></span> Add Thought
                </button>
                <button type="button" class="comic-btn tool-caption" onClick={() => addText("caption")}>
                  <span class="comic-btn-badge"><Type size={16} /></span> Add Caption
                </button>
                <button type="button" class="comic-btn tool-sfx" onClick={() => addText("sfx")}>
                  <span class="comic-btn-badge"><Zap size={16} /></span> Add SFX
                </button>
              </div>
              <div class="comic-tool-group">
                <button type="button" class="comic-btn danger" onClick={() => setClearTextConfirmOpen(true)}>
                  <Eraser size={18} /> Clear Text
                </button>
              </div>
            </div>

            <div class="comic-card comic-editor-wrap">
              <Show when={activePage()}>
                {(page) => (
                  <ComicPaper
                    page={page()}
                    selectedTextId={selectedTextId()}
                    selectedImageId={selectedImageId()}
                    onSelectText={selectText}
                    onSelectImage={selectImage}
                    onDeselectObjects={deselectObjects}
                    onUpdateImage={updatePageImage}
                    onUpdateText={updateText}
                  />
                )}
              </Show>
            </div>

            <PrintActions activePage={activePage()} pages={book().pages} />
          </section>

          <Show
            when={selectedImage()}
            fallback={
              <TextToolsPanel selectedText={selectedText()} onUpdateText={updateSelectedText} onDeleteText={requestDeleteSelectedText} />
            }
          >
            {(image) => (
              <ComicImageTools
                image={image()}
                layerIndex={selectedImageIndex()}
                layerCount={activePage()?.images?.length ?? 0}
                uploading={imageUpload.state() === "uploading"}
                uploadError={imageUpload.error()}
                onChooseImage={() => imageUpload.choose("replace")}
                onDeskew={() => setDeskewOpen(true)}
                onMoveLayer={moveSelectedImageLayer}
                onReset={resetPageImage}
                onUpdate={updatePageImage}
              />
            )}
          </Show>
        </section>
        </Show>
      </Show>
      </main>
    </div>
  );
}
