import { A } from "@solidjs/router";
import { Check, Eraser, FilePlus2, Home, MessageCircle, Sparkles, Type } from "lucide-solid";
import { For, Show, createEffect, createMemo, createSignal, onCleanup, untrack } from "solid-js";
import type { ComicBook, ComicLayoutKind, ComicPage, ComicTextElement, ComicTextKind } from "~/lib/comics/types";
import { ComicPaper } from "./ComicPaper";
import { PrintActions } from "./ComicPrintActions";
import { TemplatePicker, TemplatePreview } from "./ComicTemplatePicker";
import { TextToolsPanel } from "./ComicTextTools";
import "./comic-creator.css";

type TextPatch = Partial<Pick<ComicTextElement, "align" | "fontSize" | "panelIndex" | "text" | "width" | "x" | "y">>;

export { PrintActions } from "./ComicPrintActions";

export function ComicCreatorApp(props: { initialBook: ComicBook }) {
  const [book, setBook] = createSignal(untrack(() => props.initialBook));
  const [activePageId, setActivePageId] = createSignal(props.initialBook.pages[0]?.id ?? "");
  const [selectedTextId, setSelectedTextId] = createSignal(props.initialBook.pages[0]?.texts[0]?.id ?? "");
  const [saveState, setSaveState] = createSignal<"saved" | "saving" | "error">("saved");
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
      texts: [],
    };
    setBook((current) => ({ ...current, pages: [...current.pages, page] }));
    setActivePageId(id);
    setSelectedTextId("");
  }

  function clearText() {
    updateActivePage((page) => ({ ...page, texts: [], status: "Blank" }));
    setSelectedTextId("");
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
            <h1>{book().title}</h1>
            <p>Choose a page, switch templates, add text, and print from the bottom of the page.</p>
          </div>
          <div class="comic-save-status" data-state={saveState()} aria-live="polite">
            <Show when={saveState() === "saved"} fallback={saveState() === "saving" ? "Saving..." : "Save failed"}>
              <Check size={17} /> Saved to server JSON
            </Show>
          </div>
        </header>

        <section class="comic-content">
          <PageRail book={book()} activePageId={activePageId()} onSelect={setActivePageId} onAddPage={addPage} />

          <section class="comic-workspace">
            <TemplatePicker activeLayout={activePage()?.layout ?? "four"} onSelect={setLayout} />

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
                <button type="button" class="comic-btn danger" onClick={clearText}>
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

          <TextToolsPanel selectedText={selectedText()} onAddText={addText} onUpdateText={updateSelectedText} />
        </section>
      </main>
    </div>
  );
}

function PageRail(props: { book: ComicBook; activePageId: string; onSelect: (pageId: string) => void; onAddPage: () => void }) {
  return (
    <aside class="comic-card comic-page-rail">
      <h2>Book Pages</h2>
      <div class="comic-book-meta">
        {props.book.title} · {props.book.pages.length} pages
      </div>
      <div class="comic-thumb-list">
        <For each={props.book.pages}>
          {(page, index) => (
            <button type="button" class="comic-thumb-item" classList={{ active: props.activePageId === page.id }} onClick={() => props.onSelect(page.id)}>
              <TemplatePreview layout={page.layout} class="comic-mini-page" />
              <span>
                <span class="comic-thumb-title">
                  {index() + 1} · {page.title}
                </span>
                <span class="comic-thumb-sub">{page.status}</span>
              </span>
            </button>
          )}
        </For>
      </div>
      <button type="button" class="comic-add-page" onClick={() => props.onAddPage()}>
        <FilePlus2 size={18} /> Add New Page
      </button>
    </aside>
  );
}

function defaultText(kind: ComicTextKind) {
  if (kind === "thought") return "I HAVE\nAN IDEA!";
  if (kind === "caption") return "NEW CAPTION";
  if (kind === "sfx") return "ZAP!";
  return "HELLO!";
}
