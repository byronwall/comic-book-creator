import { For } from "solid-js";
import type { ComicLayoutKind, ComicPaperSize, ComicTemplateGrid, ComicTextElement } from "~/lib/comics/types";
import { getPanelRects, layoutTemplates } from "./comic-layouts";
import { getPaperSizeOption, paperSizeOptions } from "./comic-paper-sizes";
import { getDefaultTextHeight, speechBubblePath } from "./comic-svg-shapes";

const templatePreviewScale = 68 / 11;

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
              aria-label={template.label}
              title={template.label}
              onClick={() => props.onSelect(template.id)}
            >
              <TemplatePreview layout={template.id} paperSize={props.activePaperSize} class="comic-template-preview" />
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

export function TemplatePreview(props: {
  layout: ComicLayoutKind;
  paperSize?: ComicPaperSize;
  customGrid?: ComicTemplateGrid;
  texts?: ComicTextElement[];
  class: string;
}) {
  const previewStyle = () => {
    const paperSize = getPaperSizeOption(props.paperSize);

    return {
      width: `${paperSize.width * templatePreviewScale}px`,
      height: `${paperSize.height * templatePreviewScale}px`,
    };
  };

  return (
    <svg class={`${props.class} ${props.layout}`} style={previewStyle()} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <For each={getPanelRects({ layout: props.layout, customGrid: props.customGrid })}>
        {(panel) => (
          <rect
            class="comic-preview-panel"
            x={`${panel.x}%`}
            y={`${panel.y}%`}
            width={`${panel.width}%`}
            height={`${panel.height}%`}
          />
        )}
      </For>
      <For each={props.texts ?? []}>
        {(text) => (
          <svg
            class={`comic-preview-text ${text.kind}`}
            x={`${text.x}%`}
            y={`${text.y}%`}
            width={`${text.width}%`}
            height={`${text.height ?? getDefaultTextHeight(text.kind, text.text, text.fontSize)}%`}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            overflow="visible"
          >
            <PreviewTextShape text={text} />
          </svg>
        )}
      </For>
    </svg>
  );
}

function PreviewTextShape(props: { text: ComicTextElement }) {
  if (props.text.kind === "speech") {
    return <path class="comic-preview-shape" d={speechBubblePath} pathLength="100" />;
  }

  if (props.text.kind === "thought") {
    return (
      <>
        <rect class="comic-preview-shape" x="2" y="2" width="96" height="62" rx="24" />
        <circle class="comic-preview-shape" cx="26" cy="78" r="9" />
        <circle class="comic-preview-shape" cx="13" cy="92" r="5" />
      </>
    );
  }

  if (props.text.kind === "caption") {
    return <rect class="comic-preview-shape caption" x="2" y="18" width="96" height="64" />;
  }

  return <path class="comic-preview-shape sfx" d="M8 58 L23 18 L39 43 L59 12 L65 45 L92 31 L75 62 L91 86 L60 78 L43 96 L36 71 L8 86 Z" />;
}
