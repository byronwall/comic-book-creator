import { ArrowLeft, ArrowRight, Check, Eraser, FilePlus2, MessageCircle, Pencil, Sparkles, Trash2, Type } from "lucide-solid";
import { For, Show, createEffect, createMemo, createSignal, onCleanup, untrack } from "solid-js";
import type { ComicBook, ComicLayoutKind, ComicPage, ComicPaperSize, ComicTextElement, ComicTextKind } from "~/lib/comics/types";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { ComicAppNav } from "./ComicAppNav";
import { ComicTitleRenameDialog } from "./ComicTitleRenameDialog";
import { ComicPaper } from "./ComicPaper";
import { PrintActions } from "./ComicPrintActions";
import { TemplatePicker, TemplatePreview } from "./ComicTemplatePicker";
import { TextToolsPanel } from "./ComicTextTools";
import { defaultPaperSize } from "./comic-paper-sizes";
import { getDefaultTextHeight } from "./comic-svg-shapes";
import "./comic-creator.css";

type TextPatch = Partial<
  Pick<ComicTextElement, "align" | "autoWrap" | "fontSize" | "height" | "kind" | "panelIndex" | "rotation" | "text" | "width" | "x" | "y">
>;

export { PrintActions } from "./ComicPrintActions";

export function ComicCreatorApp(props: { initialBook: ComicBook }) {
  const [book, setBook] = createSignal(untrack(() => props.initialBook));
  const [activePageId, setActivePageId] = createSignal(props.initialBook.pages[0]?.id ?? "");
  const [selectedTextId, setSelectedTextId] = createSignal(props.initialBook.pages[0]?.texts[0]?.id ?? "");
  const [saveState, setSaveState] = createSignal<"saved" | "saving" | "error">("saved");
  const [renameOpen, setRenameOpen] = createSignal(false);
  const [clearTextConfirmOpen, setClearTextConfirmOpen] = createSignal(false);
  const [deleteTextId, setDeleteTextId] = createSignal("");
  const [deletePageId, setDeletePageId] = createSignal("");
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let acceptingServerEcho = true;

  const activePage = createMemo(() => {
    const fallback = book().pages[0];
    return book().pages.find((page) => page.id === activePageId()) ?? fallback;
  });
  const selectedText = createMemo(() => {
    const page = activePage();
    const textId = selectedTextId();
    return textId ? page?.texts.find((text) => text.id === textId) ?? null : null;
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
    updateActivePage((page) => ({ ...page, texts: [], status: "Blank" }));
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
        status: nextTexts.length > 0 ? "Draft" : "Blank",
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
            <p>Flip through pages, switch templates, add text, and print from the bottom of the page.</p>
          </div>
          <div class="comic-save-status" data-state={saveState()} aria-live="polite">
            <Show when={saveState() === "saved"} fallback={saveState() === "saving" ? "Saving..." : "Save failed"}>
              <Check size={17} /> Saved to server JSON
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
          description={`This will permanently remove "${pagePendingDelete()?.title ?? "this page"}" and its text from the book.`}
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
            onSelect={setActivePageId}
            onAddPage={addPage}
            onMoveActivePage={moveActivePage}
            onRequestDelete={setDeletePageId}
            onSetPageCover={setPageCover}
          />

          <TemplatePicker
            activeLayout={activePage()?.layout ?? "four"}
            activePaperSize={activePage()?.paperSize ?? defaultPaperSize}
            onSelect={setLayout}
            onSelectPaperSize={setPaperSize}
          />

          <section class="comic-workspace">
            <div class="comic-card comic-toolbar edit-only">
              <div class="comic-tool-group">
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
                    onSelectText={setSelectedTextId}
                    onDeselectText={() => setSelectedTextId("")}
                    onUpdateText={updateText}
                  />
                )}
              </Show>
            </div>

            <PrintActions activePage={activePage()} pages={book().pages} />
          </section>

          <TextToolsPanel selectedText={selectedText()} onUpdateText={updateSelectedText} onDeleteText={requestDeleteSelectedText} />
        </section>
      </main>
    </div>
  );
}

function PageRail(props: {
  book: ComicBook;
  activePageId: string;
  onSelect: (pageId: string) => void;
  onAddPage: () => void;
  onMoveActivePage: (direction: -1 | 1) => void;
  onRequestDelete: (pageId: string) => void;
  onSetPageCover: (pageId: string, cover: boolean) => void;
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
        <button type="button" class="comic-add-page" onClick={() => props.onAddPage()}>
          <FilePlus2 size={18} /> Add New Page
        </button>
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
                <TemplatePreview
                  layout={page.layout}
                  paperSize={page.paperSize ?? defaultPaperSize}
                  customGrid={page.customGrid}
                  texts={page.texts}
                  class="comic-mini-page"
                />
                <span class="comic-thumb-page-number">{index() + 1}</span>
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
                </div>
              </Show>
              <button
                type="button"
                class="comic-thumb-delete"
                aria-label={`Delete ${page.title}`}
                title={canDelete() ? `Delete ${page.title}` : "A book needs at least one page"}
                disabled={!canDelete()}
                onClick={() => props.onRequestDelete(page.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </For>
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
