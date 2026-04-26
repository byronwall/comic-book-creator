import { Trash2 } from "lucide-solid";
import { For, Show } from "solid-js";
import type { ComicTextAlign, ComicTextElement, ComicTextKind } from "~/lib/comics/types";
import { speechBubblePath } from "./comic-svg-shapes";

type TextPatch = Partial<Pick<ComicTextElement, "align" | "autoWrap" | "fontSize" | "kind" | "rotation" | "text">>;

const textSizeOptions = [
  { label: "S", value: 14 },
  { label: "M", value: 18 },
  { label: "L", value: 26 },
  { label: "XL", value: 36 },
  { label: "SFX", value: 44 },
];

const bubbleKindOptions: { kind: ComicTextKind; label: string }[] = [
  { kind: "speech", label: "Bubble" },
  { kind: "thought", label: "Thought" },
  { kind: "caption", label: "Caption" },
  { kind: "sfx", label: "SFX" },
];

export function TextToolsPanel(props: {
  selectedText: ComicTextElement | null;
  onUpdateText: (patch: TextPatch) => void;
  onDeleteText: () => void;
}) {
  return (
    <aside class="comic-card comic-tools">
      <Show when={props.selectedText} fallback={<p class="comic-empty-note">Add or select text to edit the printable page.</p>}>
        {(text) => (
          <>
            <section class="comic-bubble-kind-panel" aria-label="Bubble type">
              <div class="comic-bubble-kind-grid">
                <For each={bubbleKindOptions}>
                  {(option) => (
                    <button
                      type="button"
                      classList={{ active: text().kind === option.kind }}
                      aria-pressed={text().kind === option.kind}
                      onClick={() => props.onUpdateText({ kind: option.kind })}
                    >
                      <BubbleKindPreview kind={option.kind} />
                      <span>{option.label}</span>
                    </button>
                  )}
                </For>
              </div>
            </section>
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
            <label class="comic-field">
              <span>Rotation</span>
              <span class="comic-rotation-control">
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={text().rotation ?? (text().kind === "sfx" ? -9 : 0)}
                  onInput={(event) => props.onUpdateText({ rotation: Number(event.currentTarget.value) })}
                />
                <input
                  type="number"
                  aria-label="Rotation degrees"
                  min="-180"
                  max="180"
                  step="1"
                  value={text().rotation ?? (text().kind === "sfx" ? -9 : 0)}
                  onInput={(event) => props.onUpdateText({ rotation: Number(event.currentTarget.value) })}
                />
              </span>
            </label>
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

function BubbleKindPreview(props: { kind: ComicTextKind }) {
  return (
    <svg viewBox="0 0 100 70" role="img" aria-label={`${props.kind} preview`}>
      <Show when={props.kind === "speech"}>
        <path class="comic-bubble-kind-shape" d={speechBubblePath} transform="translate(0 -15) scale(1 0.85)" />
      </Show>
      <Show when={props.kind === "thought"}>
        <>
          <rect class="comic-bubble-kind-shape" x="8" y="8" width="76" height="40" rx="18" />
          <circle class="comic-bubble-kind-shape" cx="28" cy="57" r="6" />
          <circle class="comic-bubble-kind-shape" cx="17" cy="66" r="3.5" />
        </>
      </Show>
      <Show when={props.kind === "caption"}>
        <rect class="comic-bubble-kind-shape caption" x="10" y="16" width="80" height="38" />
      </Show>
      <Show when={props.kind === "sfx"}>
        <path class="comic-bubble-kind-shape sfx" d="M8 40 L22 10 L38 31 L57 7 L64 33 L92 19 L76 44 L90 62 L61 56 L44 68 L36 50 L9 61 Z" />
      </Show>
    </svg>
  );
}
