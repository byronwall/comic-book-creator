import { For, Show } from "solid-js";
import type { ComicTextAlign, ComicTextElement } from "~/lib/comics/types";

type TextPatch = Partial<Pick<ComicTextElement, "align" | "fontSize" | "text">>;

export function TextToolsPanel(props: {
  selectedText: ComicTextElement | null;
  onUpdateText: (patch: TextPatch) => void;
}) {
  return (
    <aside class="comic-card comic-tools">
      <h2>Text Properties</h2>
      <Show when={props.selectedText} fallback={<p class="comic-empty-note">Add or select text to edit the printable page.</p>}>
        {(text) => (
          <>
            <label class="comic-field">
              <span>Text</span>
              <textarea value={text().text} onInput={(event) => props.onUpdateText({ text: event.currentTarget.value })} />
            </label>
            <label class="comic-field">
              <span>Size</span>
              <input type="range" min="12" max="54" value={text().fontSize} onInput={(event) => props.onUpdateText({ fontSize: Number.parseInt(event.currentTarget.value, 10) })} />
            </label>
            <div class="comic-field">
              <span>Alignment</span>
              <div class="comic-segmented">
                <For each={["left", "center", "right"] as ComicTextAlign[]}>
                  {(align) => (
                    <button type="button" classList={{ active: text().align === align }} onClick={() => props.onUpdateText({ align })}>
                      {align}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </>
        )}
      </Show>
    </aside>
  );
}
