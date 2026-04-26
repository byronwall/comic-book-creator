import { Trash2 } from "lucide-solid";
import { For, Show } from "solid-js";
import type { ComicTextAlign, ComicTextElement } from "~/lib/comics/types";

type TextPatch = Partial<Pick<ComicTextElement, "align" | "autoWrap" | "fontSize" | "text">>;

const textSizeOptions = [
  { label: "S", value: 14 },
  { label: "M", value: 18 },
  { label: "L", value: 26 },
  { label: "XL", value: 36 },
  { label: "SFX", value: 44 },
];

export function TextToolsPanel(props: {
  selectedText: ComicTextElement | null;
  onUpdateText: (patch: TextPatch) => void;
  onDeleteText: () => void;
}) {
  return (
    <aside class="comic-card comic-tools">
      <h2>Text Properties</h2>
      <Show when={props.selectedText} fallback={<p class="comic-empty-note">Add or select text to edit the printable page.</p>}>
        {(text) => (
          <>
            <label class="comic-field">
              <span class="comic-field-label-row">
                <span>Text</span>
                <button type="button" class="comic-clear-text-button" onClick={() => props.onUpdateText({ text: "" })}>
                  Clear text
                </button>
              </span>
              <textarea value={text().text} onInput={(event) => props.onUpdateText({ text: event.currentTarget.value })} />
            </label>
            <button type="button" class="comic-btn danger comic-delete-text-button" onClick={props.onDeleteText}>
              <Trash2 size={18} /> Delete this speech bubble
            </button>
            <div class="comic-field">
              <span>Text Size</span>
              <div class="comic-segmented comic-size-options">
                <For each={textSizeOptions}>
                  {(option) => (
                    <button
                      type="button"
                      classList={{ active: text().fontSize === option.value }}
                      onClick={() => props.onUpdateText({ fontSize: option.value })}
                    >
                      {option.label}
                    </button>
                  )}
                </For>
              </div>
            </div>
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
            <label class="comic-check">
              <input
                type="checkbox"
                checked={text().autoWrap !== false}
                onChange={(event) => props.onUpdateText({ autoWrap: event.currentTarget.checked })}
              />
              <span>Wrap text to fit box</span>
            </label>
          </>
        )}
      </Show>
    </aside>
  );
}
