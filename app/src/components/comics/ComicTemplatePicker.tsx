import { For } from "solid-js";
import type { ComicLayoutKind, ComicPaperSize } from "~/lib/comics/types";
import { getPanelRects, layoutTemplates } from "./comic-layouts";
import { getPaperSizeOption, paperSizeOptions } from "./comic-paper-sizes";

export function TemplatePicker(props: {
  activeLayout: ComicLayoutKind;
  activePaperSize: ComicPaperSize;
  onSelect: (layout: ComicLayoutKind) => void;
  onSelectPaperSize: (paperSize: ComicPaperSize) => void;
}) {
  return (
    <section class="comic-card comic-template-picker" aria-label="Page templates">
      <div>
        <h2>Templates</h2>
        <p>Pick a panel layout for the selected page.</p>
      </div>
      <div class="comic-template-grid">
        <For each={layoutTemplates}>
          {(template) => (
            <button
              type="button"
              class="comic-template-button"
              classList={{ active: props.activeLayout === template.id }}
              onClick={() => props.onSelect(template.id)}
            >
              <TemplatePreview layout={template.id} paperSize={props.activePaperSize} class="comic-template-preview" />
              <span>
                <strong>{template.label}</strong>
                <small>{template.description}</small>
              </span>
            </button>
          )}
        </For>
      </div>
      <div class="comic-paper-size-panel">
        <div>
          <h2>Page Size</h2>
          <p>Choose a print area that fits on letter paper.</p>
        </div>
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
      </div>
    </section>
  );
}

export function TemplatePreview(props: { layout: ComicLayoutKind; paperSize?: ComicPaperSize; class: string }) {
  const previewStyle = () => {
    const paperSize = getPaperSizeOption(props.paperSize);
    const maxWidth = 58;
    const maxHeight = 72;
    const scale = Math.min(maxWidth / paperSize.width, maxHeight / paperSize.height);

    return {
      width: `${paperSize.width * scale}px`,
      height: `${paperSize.height * scale}px`,
    };
  };

  return (
    <span class={`${props.class} ${props.layout}`} style={previewStyle()} aria-hidden="true">
      <For each={getPanelRects({ layout: props.layout })}>
        {(panel) => (
          <span
            style={{
              left: `${panel.x}%`,
              top: `${panel.y}%`,
              width: `${panel.width}%`,
              height: `${panel.height}%`,
            }}
          />
        )}
      </For>
    </span>
  );
}
