import { MessageCircle, Sparkles, Type } from "lucide-solid";
import { For, Show } from "solid-js";
import type { ComicTextAlign, ComicTextElement, ComicTextKind } from "~/lib/comics/types";

type TextPatch = Partial<Pick<ComicTextElement, "align" | "fontSize" | "text">>;

const textKindLabels: Record<ComicTextKind, string> = {
  speech: "Speech Bubble",
  thought: "Thought Bubble",
  caption: "Caption Box",
  sfx: "Sound Effect",
};

const textKindIcons: Record<ComicTextKind, typeof MessageCircle> = {
  speech: MessageCircle,
  thought: Sparkles,
  caption: Type,
  sfx: Sparkles,
};

export function TextToolsPanel(props: {
  selectedText: ComicTextElement | null;
  onAddText: (kind: ComicTextKind) => void;
  onUpdateText: (patch: TextPatch) => void;
}) {
  return (
    <aside class="comic-card comic-tools">
      <h2>Add Text</h2>
      <For each={["speech", "thought", "caption", "sfx"] as ComicTextKind[]}>
        {(kind) => {
          const Icon = textKindIcons[kind];
          return (
            <button type="button" class="comic-tool-tile" classList={{ active: props.selectedText?.kind === kind }} onClick={() => props.onAddText(kind)}>
              <Icon size={24} />
              <span>{textKindLabels[kind]}</span>
            </button>
          );
        }}
      </For>

      <hr />
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
