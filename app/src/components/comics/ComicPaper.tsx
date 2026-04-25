import { For, Show, createMemo } from "solid-js";
import type { ComicPage, ComicTextElement } from "~/lib/comics/types";
import { clamp, findPanelIndex, getPanelRects } from "./comic-layouts";

type TextPatch = Partial<Pick<ComicTextElement, "fontSize" | "panelIndex" | "width" | "x" | "y">>;

type DragState =
  | {
      kind: "move";
      pointerId: number;
      textId: string;
      startPointerX: number;
      startPointerY: number;
      startTextX: number;
      startTextY: number;
    }
  | {
      kind: "resize";
      pointerId: number;
      textId: string;
      startClientX: number;
      startClientY: number;
      startWidth: number;
      startFontSize: number;
    };

export function ComicPaper(props: {
  page: ComicPage;
  selectedTextId: string;
  onSelectText: (textId: string) => void;
  onUpdateText: (textId: string, patch: TextPatch) => void;
}) {
  let layoutRef: HTMLDivElement | undefined;
  let dragState: DragState | null = null;
  const panels = createMemo(() => getPanelRects(props.page));

  function getPagePoint(event: PointerEvent) {
    const layout = layoutRef;
    if (!layout) return null;
    const bounds = layout.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    };
  }

  function dragText(event: PointerEvent, text: ComicTextElement) {
    event.preventDefault();
    event.stopPropagation();
    props.onSelectText(text.id);

    const startPoint = getPagePoint(event);
    const layout = layoutRef;
    if (!startPoint || !layout) return;

    layout.setPointerCapture(event.pointerId);
    dragState = {
      kind: "move",
      pointerId: event.pointerId,
      textId: text.id,
      startPointerX: startPoint.x,
      startPointerY: startPoint.y,
      startTextX: text.x,
      startTextY: text.y,
    };
  }

  function resizeText(event: PointerEvent, text: ComicTextElement) {
    event.preventDefault();
    event.stopPropagation();
    props.onSelectText(text.id);

    const layout = layoutRef;
    if (!layout) return;

    layout.setPointerCapture(event.pointerId);
    dragState = {
      kind: "resize",
      pointerId: event.pointerId,
      textId: text.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidth: text.width,
      startFontSize: text.fontSize,
    };
  }

  function updateDrag(event: PointerEvent) {
    const state = dragState;
    if (!state || state.pointerId !== event.pointerId) return;
    event.preventDefault();

    if (state.kind === "move") {
      const point = getPagePoint(event);
      if (!point) return;
      const x = state.startTextX + point.x - state.startPointerX;
      const y = state.startTextY + point.y - state.startPointerY;
      props.onUpdateText(state.textId, {
        panelIndex: findPanelIndex(panels(), x, y),
        x: clamp(x, -8, 98),
        y: clamp(y, -8, 98),
      });
      return;
    }

    const layout = layoutRef;
    if (!layout) return;
    const bounds = layout.getBoundingClientRect();
    const widthDelta = ((event.clientX - state.startClientX) / bounds.width) * 100;
    const fontDelta = (event.clientY - state.startClientY) / 8;
    props.onUpdateText(state.textId, {
      width: clamp(state.startWidth + widthDelta, 8, 96),
      fontSize: Math.round(clamp(state.startFontSize + fontDelta, 12, 54)),
    });
  }

  function endDrag(event: PointerEvent) {
    const state = dragState;
    if (!state || state.pointerId !== event.pointerId) return;
    const layout = layoutRef;
    if (layout?.hasPointerCapture(event.pointerId)) {
      layout.releasePointerCapture(event.pointerId);
    }
    dragState = null;
  }

  return (
    <div class="comic-paper" aria-label="Printable comic page preview">
      <div
        ref={layoutRef}
        class={`comic-page-layout ${props.page.layout}`}
        onPointerMove={updateDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <For each={panels()}>
          {(panel) => (
            <div
              class="comic-panel"
              style={{
                left: `${panel.x}%`,
                top: `${panel.y}%`,
                width: `${panel.width}%`,
                height: `${panel.height}%`,
              }}
            />
          )}
        </For>

        <For each={props.page.texts}>
          {(text) => (
            <button
              type="button"
              class={`comic-text ${text.kind}`}
              classList={{ selected: props.selectedTextId === text.id }}
              style={{
                left: `${text.x}%`,
                top: `${text.y}%`,
                width: `${text.width}%`,
                "font-size": `${text.fontSize}px`,
                "text-align": text.align,
              }}
              onPointerDown={(event) => dragText(event, text)}
            >
              <For each={text.text.split("\n")}>
                {(line, index) => (
                  <>
                    <Show when={index() > 0}>
                      <br />
                    </Show>
                    {line}
                  </>
                )}
              </For>
              <Show when={props.selectedTextId === text.id}>
                <span class="comic-handle nw" />
                <span class="comic-handle ne" />
                <span class="comic-handle sw" />
                <span class="comic-handle se" onPointerDown={(event) => resizeText(event, text)} />
              </Show>
            </button>
          )}
        </For>
      </div>
    </div>
  );
}
