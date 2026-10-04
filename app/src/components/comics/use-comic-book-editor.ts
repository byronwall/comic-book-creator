import { createEffect, createMemo, createSignal, untrack } from "solid-js";
import type { ComicBook, ComicLayoutKind, ComicPage, ComicPageImage, ComicPaperSize, ComicTextElement, ComicTextKind } from "~/lib/comics/types";
import { defaultPaperSize } from "./comic-paper-sizes";
import { useComicImageLayers } from "./use-comic-image-layers";
import { getDefaultTextHeight } from "./comic-svg-shapes";

type TextPatch = Partial<
  Pick<ComicTextElement, "align" | "autoWrap" | "fontSize" | "height" | "kind" | "panelIndex" | "rotation" | "text" | "width" | "x" | "y">
>;

export function useComicBookEditor(initialBook: ComicBook) {
  const [book, setBook] = createSignal(untrack(() => initialBook));
  const [activePageId, setActivePageId] = createSignal(initialBook.pages[0]?.id ?? "");
  const [selectedTextId, setSelectedTextId] = createSignal(initialBook.pages[0]?.texts[0]?.id ?? "");
  const [selectedImageId, setSelectedImageId] = createSignal(
    initialBook.pages[0]?.texts[0] ? "" : initialBook.pages[0]?.images?.[0]?.id ?? "",
  );
  const [deleteTextId, setDeleteTextId] = createSignal("");
  const [deletePageId, setDeletePageId] = createSignal("");
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

  function updateActivePage(updater: (page: ComicPage) => ComicPage) {
    setBook((current) => ({
      ...current,
      pages: current.pages.map((page) => (page.id === activePageId() ? updater(page) : page)),
    }));
  }

  const imageEditor = useComicImageLayers({ updateActivePage, selectedImageId, setSelectedTextId, setSelectedImageId });

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

  return {
    book, setBook, activePageId, setActivePageId, selectedTextId, setSelectedTextId, selectedImageId, setSelectedImageId,
    deleteTextId, setDeleteTextId, deletePageId, setDeletePageId, activePage, selectedText, selectedImage, selectedImageIndex,
    textPendingDelete, pagePendingDelete, updateActivePage, setLayout, setPaperSize, addText, addPage, addImagePage,
    ...imageEditor, selectText, selectImage,
    deselectObjects, selectPage, deletePage, moveActivePage, setPageCover, clearText, requestDeleteSelectedText,
    deleteText, renameBook, updateSelectedText, updateText,
  };
}

function defaultText(kind: ComicTextKind) {
  if (kind === "thought") return "I HAVE\nAN IDEA!";
  if (kind === "caption") return "NEW CAPTION";
  if (kind === "sfx") return "ZAP!";
  return "HELLO!";
}
