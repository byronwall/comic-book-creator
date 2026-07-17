import { ArrowLeft, ArrowRight, Camera, Check, Eraser, FilePlus2, MessageCircle, Pencil, Sparkles, Trash2, Type } from "lucide-solid";
import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount, untrack } from "solid-js";
import type { ComicBook, ComicLayoutKind, ComicPage, ComicPageImage, ComicPaperSize, ComicTextElement, ComicTextKind } from "~/lib/comics/types";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { ComicAppNav } from "./ComicAppNav";
import { ComicTitleRenameDialog } from "./ComicTitleRenameDialog";
import { ComicPaper } from "./ComicPaper";
import { ComicImageTools } from "./ComicImageTools";
import { PrintActions } from "./ComicPrintActions";
import { TemplatePicker, TemplatePreview } from "./ComicTemplatePicker";
import { TextToolsPanel } from "./ComicTextTools";
import { layoutTemplates } from "./comic-layouts";
import { defaultPaperSize, paperSizeOptions } from "./comic-paper-sizes";
import { getDefaultTextHeight } from "./comic-svg-shapes";
import { useComicImageUpload } from "./use-comic-image-upload";
import "./comic-creator.css";

type TextPatch = Partial<
  Pick<ComicTextElement, "align" | "autoWrap" | "fontSize" | "height" | "kind" | "panelIndex" | "rotation" | "text" | "width" | "x" | "y">
>;

export { PrintActions } from "./ComicPrintActions";

export function ComicCreatorApp(props: { initialBook: ComicBook }) {
  const [book, setBook] = createSignal(untrack(() => props.initialBook));
  const [activePageId, setActivePageId] = createSignal(props.initialBook.pages[0]?.id ?? "");
  const [selectedTextId, setSelectedTextId] = createSignal(props.initialBook.pages[0]?.texts[0]?.id ?? "");
  const [selectedImageId, setSelectedImageId] = createSignal(
    props.initialBook.pages[0]?.texts[0] ? "" : props.initialBook.pages[0]?.images?.[0]?.id ?? "",
  );
  const [saveState, setSaveState] = createSignal<"saved" | "saving" | "error">("saved");
  const [renameOpen, setRenameOpen] = createSignal(false);
  const [clearTextConfirmOpen, setClearTextConfirmOpen] = createSignal(false);
  const [deleteTextId, setDeleteTextId] = createSignal("");
  const [deletePageId, setDeletePageId] = createSignal("");
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let acceptingServerEcho = true;
  const imageUpload = useComicImageUpload({
    bookId: () => book().id,
    onLayerImage: addImageLayer,
    onNewImage: addImagePage,
    onReplaceImage: replaceImage,
  });

  const activePage = createMemo(() => {
    const fallback = book().pages[0];
    return book().pages.find((page) => page.id === activePageId()) ?? fallback;
  });
  const selectedText = createMemo(() => {
    const page = activePage();
    const textId = selectedTextId();
    return textId ? page?.texts.find((text) => text.id === textId) ?? null : null;
  });
  const selectedImage = createMemo(() => {
    const imageId = selectedImageId();
    return imageId ? activePage()?.images?.find((image) => image.id === imageId) ?? null : null;
  });
  const selectedImageIndex = createMemo(() => {
    const imageId = selectedImageId();
    return imageId ? activePage()?.images?.findIndex((image) => image.id === imageId) ?? -1 : -1;
  });
  const textPendingDelete = createMemo(() => activePage()?.texts.find((text) => text.id === deleteTextId()) ?? null);
  const pagePendingDelete = createMemo(() => book().pages.find((page) => page.id === deletePageId()) ?? null);

  createEffect(() => {
    const nextBook = props.initialBook;
    setBook(nextBook);
    setActivePageId((current) => current || nextBook.pages[0]?.id || "");
  });

  createEffect(() => {
    const page = activePage();
    if (!page) return;
    const textId = selectedTextId();
    if (textId && !page.texts.some((text) => text.id === textId)) {
      setSelectedTextId(page.texts[0]?.id ?? "");
    }
    const imageId = selectedImageId();
    if (imageId && !page.images?.some((image) => image.id === imageId)) {
      setSelectedImageId("");
    }
  });

  createEffect(() => {
    const nextBook = book();
    if (acceptingServerEcho) {
      acceptingServerEcho = false;
      return;
    }

    setSaveState("saving");
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveBook(nextBook);
    }, 350);
  });

  onMount(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, [contenteditable='true']")) {
        return;
      }

      const imageItem = Array.from(event.clipboardData?.items ?? []).find(
        (item) => item.kind === "file" && item.type.startsWith("image/"),
      );
      const pastedFile = imageItem?.getAsFile();
      if (!pastedFile) return;

      event.preventDefault();
      const file = pastedFile.name
        ? pastedFile
        : new File([pastedFile], `pasted-comic-page-${Date.now()}.png`, { type: pastedFile.type || "image/png" });
      void imageUpload.upload(file, "layer");
    };

    window.addEventListener("paste", handlePaste);
    onCleanup(() => window.removeEventListener("paste", handlePaste));
  });

  onCleanup(() => {
    if (saveTimer) clearTimeout(saveTimer);
  });

  function saveBook(nextBook: ComicBook) {
    const savedSnapshot = JSON.stringify(nextBook);
    return fetch(`/api/comic-books/${nextBook.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(nextBook),
    })
      .then((response) => {
        if (!response.ok) throw new Error(`Save failed: ${response.status}`);
        return response.json() as Promise<ComicBook>;
      })
      .then((savedBook) => {
        if (untrack(() => JSON.stringify(book())) !== savedSnapshot) {
          return;
        }

        acceptingServerEcho = true;
        setBook(savedBook);
        setSaveState("saved");
      })
      .catch(() => {
        setSaveState("error");
      });
  }

  function updateActivePage(updater: (page: ComicPage) => ComicPage) {
    setBook((current) => ({
      ...current,
      pages: current.pages.map((page) => (page.id === activePageId() ? updater(page) : page)),
    }));
  }

  function setLayout(layout: ComicLayoutKind) {
    updateActivePage((page) => ({
      ...page,
      mode: "comic",
      layout,
      customGrid: layout === "custom" ? page.customGrid : undefined,
      status: page.status === "Blank" ? "Draft" : page.status,
    }));
  }

  function setPaperSize(paperSize: ComicPaperSize) {
    updateActivePage((page) => ({
      ...page,
      paperSize,
      status: page.status === "Blank" ? "Draft" : page.status,
    }));
  }

  function addText(kind: ComicTextKind) {
    const id = `${kind}-${Date.now()}`;
    const text: ComicTextElement = {
      id,
      kind,
      text: defaultText(kind),
      panelIndex: 0,
      positionScope: "page",
      x: kind === "sfx" ? 28 : 10,
      y: kind === "sfx" ? 24 : 10,
      width: kind === "sfx" ? 22 : 34,
      height: getDefaultTextHeight(kind, defaultText(kind), kind === "sfx" ? 44 : kind === "speech" ? 18 : 15),
      fontSize: kind === "sfx" ? 44 : kind === "speech" ? 18 : 15,
      rotation: kind === "sfx" ? -9 : 0,
      align: "center",
      autoWrap: true,
    };
    updateActivePage((page) => ({ ...page, status: "Draft", texts: [...page.texts, text] }));
    setSelectedTextId(id);
    setSelectedImageId("");
  }

  function addPage() {
    const pageNumber = book().pages.length + 1;
    const id = `page-${pageNumber}-${Date.now()}`;
    const page: ComicPage = {
      id,
      title: `Page ${pageNumber}`,
      status: "Blank",
      layout: "four",
      paperSize: defaultPaperSize,
      texts: [],
    };
    setBook((current) => ({ ...current, pages: [...current.pages, page] }));
    setActivePageId(id);
    setSelectedTextId("");
    setSelectedImageId("");
  }

  function addImagePage(image: ComicPageImage) {
    const pageNumber = book().pages.length + 1;
    const id = `page-${pageNumber}-${Date.now()}`;
    const page: ComicPage = {
      id,
      title: `Page ${pageNumber}`,
      status: "Draft",
      layout: "blank",
      mode: "image",
      images: [image],
      paperSize: defaultPaperSize,
      texts: [],
    };
    setBook((current) => ({ ...current, pages: [...current.pages, page] }));
    setActivePageId(id);
    setSelectedTextId("");
    setSelectedImageId(image.id);
  }

  function addImageLayer(image: ComicPageImage) {
    updateActivePage((page) => {
      const images = page.images ?? [];
      const cascade = images.length % 5;
      const layeredImage = images.length === 0
        ? image
        : { ...image, x: 8 + cascade * 4, y: 8 + cascade * 4, width: 72, height: 72 };
      return {
        ...page,
        mode: "image",
        layout: "blank",
        images: [...images, layeredImage],
        status: "Draft",
      };
    });
    setSelectedTextId("");
    setSelectedImageId(image.id);
  }

  function updatePageImage(patch: Partial<ComicPageImage>) {
    const imageId = selectedImageId();
    if (!imageId) return;
    updateActivePage((page) => ({
      ...page,
      images: page.images?.map((image) => image.id === imageId ? { ...image, ...patch } : image),
      status: "Draft",
    }));
  }

  function replaceImage(image: ComicPageImage) {
    const imageId = selectedImageId();
    if (!imageId) {
      addImageLayer(image);
      return;
    }
    updateActivePage((page) => ({
      ...page,
      mode: "image",
      layout: "blank",
      images: page.images?.map((currentImage) => currentImage.id === imageId
        ? {
            ...currentImage,
            src: image.src,
            filename: image.filename,
            originalName: image.originalName,
            mimeType: image.mimeType,
          }
        : currentImage),
      status: "Draft",
    }));
    setSelectedTextId("");
  }

  function resetPageImage() {
    const imageId = selectedImageId();
    if (!imageId) return;
    updateActivePage((page) => {
      const selected = page.images?.find((image) => image.id === imageId);
      if (!selected) return page;
      const background = { ...selected, x: 0, y: 0, width: 100, height: 100, rotation: 0, fit: "contain" as const };
      return { ...page, images: [background, ...(page.images?.filter((image) => image.id !== imageId) ?? [])], status: "Draft" };
    });
  }

  function moveSelectedImageLayer(direction: -1 | 1) {
    const imageId = selectedImageId();
    if (!imageId) return;
    updateActivePage((page) => {
      const images = [...(page.images ?? [])];
      const currentIndex = images.findIndex((image) => image.id === imageId);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= images.length) return page;
      [images[currentIndex], images[nextIndex]] = [images[nextIndex], images[currentIndex]];
      return { ...page, images, status: "Draft" };
    });
  }

  function selectText(textId: string) {
    setSelectedTextId(textId);
    setSelectedImageId("");
  }

  function selectImage(imageId: string) {
    setSelectedTextId("");
    setSelectedImageId(imageId);
  }

  function deselectObjects() {
    setSelectedTextId("");
    setSelectedImageId("");
  }

  function selectPage(pageId: string) {
    setActivePageId(pageId);
    setSelectedTextId("");
    setSelectedImageId("");
  }

  function deletePage(pageId: string) {
    const pages = book().pages;
    if (pages.length <= 1) return;

    const deletedIndex = pages.findIndex((page) => page.id === pageId);
    if (deletedIndex < 0) return;

    const nextPages = pages.filter((page) => page.id !== pageId);
    const nextActivePage =
      activePageId() === pageId ? nextPages[Math.min(deletedIndex, nextPages.length - 1)] : nextPages.find((page) => page.id === activePageId());

    setBook((current) => ({ ...current, pages: current.pages.filter((page) => page.id !== pageId) }));
    setActivePageId(nextActivePage?.id ?? nextPages[0]?.id ?? "");
    setSelectedTextId(nextActivePage?.texts[0]?.id ?? "");
    setSelectedImageId("");
    setDeletePageId("");
  }

  function moveActivePage(direction: -1 | 1) {
    const pageId = activePageId();
    if (!pageId) return;

    setBook((current) => {
      const currentIndex = current.pages.findIndex((page) => page.id === pageId);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.pages.length) return current;

      const pages = [...current.pages];
      const [page] = pages.splice(currentIndex, 1);
      if (!page) return current;
      pages.splice(nextIndex, 0, page);

      return { ...current, pages };
    });
  }

  function setPageCover(pageId: string, cover: boolean) {
    setBook((current) => ({
      ...current,
      pages: current.pages.map((page) => (page.id === pageId ? { ...page, cover } : page)),
    }));
  }

  function clearText() {
    updateActivePage((page) => ({ ...page, texts: [], status: page.mode === "image" ? "Draft" : "Blank" }));
    setSelectedTextId("");
  }

  function requestDeleteSelectedText() {
    const textId = selectedText()?.id;
    if (!textId) return;
    setDeleteTextId(textId);
  }

  function deleteText(textId: string) {
    updateActivePage((page) => {
      const deletedIndex = page.texts.findIndex((text) => text.id === textId);
      if (deletedIndex < 0) return page;

      const nextTexts = page.texts.filter((text) => text.id !== textId);
      const nextSelectedText = nextTexts[Math.min(deletedIndex, nextTexts.length - 1)] ?? null;
      setSelectedTextId(nextSelectedText?.id ?? "");

      return {
        ...page,
        texts: nextTexts,
        status: nextTexts.length > 0 || page.mode === "image" ? "Draft" : "Blank",
      };
    });
    setDeleteTextId("");
  }

  function renameBook(nextTitle: string) {
    setBook((current) => ({ ...current, title: nextTitle }));
  }

  function updateSelectedText(patch: TextPatch) {
    updateText(selectedTextId(), patch);
  }

  function updateText(textId: string, patch: TextPatch) {
    updateActivePage((page) => ({
      ...page,
      status: "Draft",
      texts: page.texts.map((text) => (text.id === textId ? { ...text, ...patch, positionScope: "page" } : text)),
    }));
  }

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
      <ComicAppNav />

      <main class="comic-main">
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
          <div class="comic-save-status" data-state={saveState()} aria-live="polite">
            <Show when={saveState() === "saved"} fallback={saveState() === "saving" ? "Saving..." : "Save failed"}>
              <Check size={17} /> Saved to server
            </Show>
          </div>
        </header>
        <ComicTitleRenameDialog
          open={renameOpen()}
          title={book().title}
          onOpenChange={setRenameOpen}
          onRename={renameBook}
        />
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

        <section class="comic-content">
          <PageRail
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
                <button type="button" class="comic-btn" onClick={() => imageUpload.choose("replace")}>
                  <Camera size={18} /> {activePage()?.mode === "image" ? "Replace Photo" : "Use Photo"}
                </button>
                <button type="button" class="comic-btn" onClick={() => addText("speech")}>
                  <MessageCircle size={18} /> Add Bubble
                </button>
                <button type="button" class="comic-btn" onClick={() => addText("thought")}>
                  <Sparkles size={18} /> Add Thought
                </button>
                <button type="button" class="comic-btn" onClick={() => addText("caption")}>
                  <Type size={18} /> Add Caption
                </button>
                <button type="button" class="comic-btn" onClick={() => addText("sfx")}>
                  <Sparkles size={18} /> Add SFX
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
                onMoveLayer={moveSelectedImageLayer}
                onReset={resetPageImage}
                onUpdate={updatePageImage}
              />
            )}
          </Show>
        </section>
      </main>
    </div>
  );
}

function PageRail(props: {
  book: ComicBook;
  activePageId: string;
  activeLayout: ComicLayoutKind;
  activePaperSize: ComicPaperSize;
  onSelect: (pageId: string) => void;
  onAddPage: () => void;
  onAddImagePage: () => void;
  imageUploading: boolean;
  onMoveActivePage: (direction: -1 | 1) => void;
  onRequestDelete: (pageId: string) => void;
  onSetPageCover: (pageId: string, cover: boolean) => void;
  onSelectLayout: (layout: ComicLayoutKind) => void;
  onSelectPaperSize: (paperSize: ComicPaperSize) => void;
}) {
  const canDelete = () => props.book.pages.length > 1;
  const activeIndex = createMemo(() => props.book.pages.findIndex((page) => page.id === props.activePageId));
  const canMoveLeft = () => activeIndex() > 0;
  const canMoveRight = () => activeIndex() >= 0 && activeIndex() < props.book.pages.length - 1;

  return (
    <aside class="comic-card comic-page-rail">
      <div class="comic-page-rail-header">
        <div>
          <h2>Book Pages</h2>
          <div class="comic-book-meta">
            {props.book.title} · {props.book.pages.length} pages
          </div>
        </div>
        <div class="comic-add-page-actions">
          <button type="button" class="comic-add-page" onClick={() => props.onAddPage()}>
            <FilePlus2 size={18} /> Add Blank Page
          </button>
          <button type="button" class="comic-add-page comic-add-photo-page" disabled={props.imageUploading} onClick={props.onAddImagePage}>
            <Camera size={18} /> {props.imageUploading ? "Uploading..." : "Add Photo Page"}
          </button>
        </div>
      </div>
      <div class="comic-thumb-list">
        <For each={props.book.pages}>
          {(page, index) => (
            <div class="comic-thumb-item" classList={{ active: props.activePageId === page.id }}>
              <Show when={index() === 0 || index() === props.book.pages.length - 1}>
                <label class="comic-thumb-cover-mark">
                  <input
                    type="checkbox"
                    checked={page.cover === true}
                    onChange={(event) => props.onSetPageCover(page.id, event.currentTarget.checked)}
                  />
                  <span>Cover</span>
                </label>
              </Show>
              <button
                type="button"
                class="comic-thumb-select"
                aria-label={`Select page ${index() + 1}`}
                onClick={() => props.onSelect(page.id)}
              >
                <span class="comic-thumb-page-number">{index() + 1}</span>
                <TemplatePreview
                  layout={page.layout}
                  paperSize={page.paperSize ?? defaultPaperSize}
                  customGrid={page.customGrid}
                  texts={page.texts}
                  images={page.mode === "image" ? page.images : undefined}
                  class="comic-mini-page"
                />
              </button>
              <Show when={props.activePageId === page.id}>
                <div class="comic-thumb-move-controls" aria-label={`Move ${page.title}`}>
                  <button
                    type="button"
                    class="comic-thumb-move"
                    aria-label={`Move ${page.title} left`}
                    title={canMoveLeft() ? `Move ${page.title} before page ${index()}` : `${page.title} is already first`}
                    disabled={!canMoveLeft()}
                    onClick={() => props.onMoveActivePage(-1)}
                  >
                    <ArrowLeft size={15} />
                  </button>
                  <button
                    type="button"
                    class="comic-thumb-move"
                    aria-label={`Move ${page.title} right`}
                    title={canMoveRight() ? `Move ${page.title} after page ${index() + 2}` : `${page.title} is already last`}
                    disabled={!canMoveRight()}
                    onClick={() => props.onMoveActivePage(1)}
                  >
                    <ArrowRight size={15} />
                  </button>
                  <span class="comic-thumb-control-divider" aria-hidden="true" />
                  <button
                    type="button"
                    class="comic-thumb-delete"
                    aria-label={`Delete ${page.title}`}
                    title={canDelete() ? `Delete ${page.title}` : "A book needs at least one page"}
                    disabled={!canDelete()}
                    onClick={() => props.onRequestDelete(page.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Show>
            </div>
          )}
        </For>
      </div>
      <div class="comic-page-rail-controls" aria-label="Selected page setup">
        <details class="comic-rail-disclosure">
          <summary>
            <span>Templates</span>
            <strong>{layoutTemplates.find((template) => template.id === props.activeLayout)?.label ?? "Template"}</strong>
          </summary>
          <div class="comic-rail-template-grid">
            <For each={layoutTemplates}>
              {(template) => (
                <button
                  type="button"
                  class="comic-template-button"
                  classList={{ active: props.activeLayout === template.id }}
                  aria-label={template.label}
                  title={template.label}
                  onClick={() => props.onSelectLayout(template.id)}
                >
                  <TemplatePreview layout={template.id} paperSize={props.activePaperSize} class="comic-template-preview" />
                </button>
              )}
            </For>
          </div>
        </details>
        <details class="comic-rail-disclosure">
          <summary>
            <span>Page Size</span>
            <strong>{paperSizeOptions.find((option) => option.id === props.activePaperSize)?.label ?? "Page Size"}</strong>
          </summary>
          <div class="comic-paper-size-grid">
            <For each={paperSizeOptions}>
              {(option) => (
                <button
                  type="button"
                  class="comic-paper-size-button"
                  classList={{ active: props.activePaperSize === option.id }}
                  onClick={() => props.onSelectPaperSize(option.id)}
                >
                  <span
                    class="comic-paper-size-preview"
                    style={{ "aspect-ratio": `${option.width} / ${option.height}` }}
                    aria-hidden="true"
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </button>
              )}
            </For>
          </div>
        </details>
      </div>
    </aside>
  );
}

function defaultText(kind: ComicTextKind) {
  if (kind === "thought") return "I HAVE\nAN IDEA!";
  if (kind === "caption") return "NEW CAPTION";
  if (kind === "sfx") return "ZAP!";
  return "HELLO!";
}
