import { For } from "solid-js";
import type { ComicLayoutKind } from "~/lib/comics/types";
import { getPanelRects, layoutTemplates } from "./comic-layouts";

export function TemplatePicker(props: { activeLayout: ComicLayoutKind; onSelect: (layout: ComicLayoutKind) => void }) {
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
              <TemplatePreview layout={template.id} class="comic-template-preview" />
              <span>
                <strong>{template.label}</strong>
                <small>{template.description}</small>
              </span>
            </button>
          )}
        </For>
      </div>
    </section>
  );
}

export function TemplatePreview(props: { layout: ComicLayoutKind; class: string }) {
  return (
    <span class={`${props.class} ${props.layout}`} aria-hidden="true">
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
