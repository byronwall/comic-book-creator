import { A } from "@solidjs/router";
import { Check, Eraser, FilePlus2, Home, MessageCircle, Pencil, Sparkles, Trash2, Type } from "lucide-solid";
import { For, Show, createEffect, createMemo, createSignal, onCleanup, untrack } from "solid-js";
import type { ComicBook, ComicLayoutKind, ComicPage, ComicPaperSize, ComicTextElement, ComicTextKind } from "~/lib/comics/types";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { ComicTitleRenameDialog } from "./ComicTitleRenameDialog";
import { ComicPaper } from "./ComicPaper";
import { PrintActions } from "./ComicPrintActions";
import { TemplatePicker, TemplatePreview } from "./ComicTemplatePicker";
import { TextToolsPanel } from "./ComicTextTools";
import { defaultPaperSize } from "./comic-paper-sizes";
import "./comic-creator.css";

type TextPatch = Partial<Pick<ComicTextElement, "align" | "fontSize" | "panelIndex" | "text" | "width" | "x" | "y">>;

export { PrintActions } from "./ComicPrintActions";

export function ComicCreatorApp(props: { initialBook: ComicBook }) {
  const [book, setBook] = createSignal(untrack(() => props.initialBook));
  const [activePageId, setActivePageId] = createSignal(props.initialBook.pages[0]?.id ?? "");
  const [selectedTextId, setSelectedTextId] = createSignal(props.initialBook.pages[0]?.texts[0]?.id ?? "");
  const [saveState, setSaveState] = createSignal<"saved" | "saving" | "error">("saved");
  const [renameOpen, setRenameOpen] = createSignal(false);
  const [clearTextConfirmOpen, setClearTextConfirmOpen] = createSignal(false);
  const [deletePageId, setDeletePageId] = createSignal("");
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let acceptingServerEcho = true;

  const activePage = createMemo(() => {
    const fallback = book().pages[0];
    return book().pages.find((page) => page.id === activePageId()) ?? fallback;
  });
  const selectedText = createMemo(() => {
    const page = activePage();
    return page?.texts.find((text) => text.id === selectedTextId()) ?? page?.texts[0] ?? null;
  });
  const pagePendingDelete = createMemo(() => book().pages.find((page) => page.id === deletePageId()) ?? null);

  createEffect(() => {
    const nextBook = props.initialBook;
    setBook(nextBook);
    setActivePageId((current) => current || nextBook.pages[0]?.id || "");
  });

  createEffect(() => {
    const page = activePage();
    if (!page) return;
    if (!page.texts.some((text) => text.id === selectedTextId())) {
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
      fontSize: kind === "sfx" ? 44 : kind === "speech" ? 18 : 15,
      align: "center",
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

  function clearText() {
    updateActivePage((page) => ({ ...page, texts: [], status: "Blank" }));
    setSelectedTextId("");
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
      <aside class="comic-sidebar" aria-label="App navigation">
        <div class="comic-logo" aria-label="Comic Book Creator">
          <span>Comic Book</span>
          <strong>Creator</strong>
        </div>
        <nav class="comic-nav">
          <A href="/" class="active">
            <span class="comic-nav-icon">
              <Home size={21} />
            </span>
            Index
          </A>
        </nav>
        <section class="comic-sidebar-tip">
          <strong>Print your comic</strong>
          <p>Choose a template, add words, then print the page for hand-drawn art.</p>
        </section>
      </aside>

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

        <section class="comic-content">
          <PageRail
            book={book()}
            activePageId={activePageId()}
            onSelect={setActivePageId}
            onAddPage={addPage}
            onRequestDelete={setDeletePageId}
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
                    onUpdateText={updateText}
                  />
                )}
              </Show>
            </div>

            <PrintActions />
          </section>

          <TextToolsPanel selectedText={selectedText()} onUpdateText={updateSelectedText} />
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
  onRequestDelete: (pageId: string) => void;
}) {
  const canDelete = () => props.book.pages.length > 1;

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
              <button
                type="button"
                class="comic-thumb-select"
                aria-label={`Select page ${index() + 1}`}
                onClick={() => props.onSelect(page.id)}
              >
                <TemplatePreview layout={page.layout} paperSize={page.paperSize ?? defaultPaperSize} class="comic-mini-page" />
                <span class="comic-thumb-page-number">{index() + 1}</span>
              </button>
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
