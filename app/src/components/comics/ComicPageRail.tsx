import { ArrowLeft, ArrowRight, Trash2 } from "lucide-solid";
import { ComicArt } from "./ComicArt";
import { For, Show, createMemo } from "solid-js";
import type { ComicBook, ComicLayoutKind, ComicPaperSize } from "~/lib/comics/types";
import { TemplatePreview } from "./ComicTemplatePicker";
import { layoutTemplates } from "./comic-layouts";
import { defaultPaperSize, paperSizeOptions } from "./comic-paper-sizes";

export function ComicPageRail(props: {
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
          <h2>Pages</h2>
          <div class="comic-book-meta">
            {props.book.pages.length === 1 ? "1 page" : `${props.book.pages.length} pages`} · click one to edit it
          </div>
        </div>
        <div class="comic-add-page-actions">
          <button type="button" class="comic-add-page" onClick={() => props.onAddPage()}>
            <ComicArt name="page-add" size={30} /> Add Blank Page
          </button>
          <button type="button" class="comic-add-page comic-add-photo-page" disabled={props.imageUploading} onClick={props.onAddImagePage}>
            <ComicArt name="page-photo" size={30} /> {props.imageUploading ? "Uploading…" : "Add Photo Page"}
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
            <span>Page layout</span>
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
            <span>Page size</span>
            <strong>{paperSizeOptions.find((option) => option.id === props.activePaperSize)?.label ?? "Page size"}</strong>
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
