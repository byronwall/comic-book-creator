import { For, Show, createMemo, onCleanup } from "solid-js";
import type { ComicPage, ComicTextElement } from "~/lib/comics/types";
import { clamp, findPanelIndex, getPanelRects } from "./comic-layouts";
import { getPaperSizeOption } from "./comic-paper-sizes";
import { getDefaultTextHeight, lineHeightMultiplier, speechBubblePath } from "./comic-svg-shapes";

type TextPatch = Partial<Pick<ComicTextElement, "height" | "fontSize" | "panelIndex" | "width" | "x" | "y">>;
type ResizeCorner = "nw" | "ne" | "sw" | "se";

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
      startX: number;
      startY: number;
      startWidth: number;
      startHeight: number;
      corner: ResizeCorner;
    };

export function ComicPaper(props: {
  page: ComicPage;
  selectedTextId: string;
  onSelectText: (textId: string) => void;
  onDeselectText: () => void;
  onUpdateText: (textId: string, patch: TextPatch) => void;
}) {
  let layoutRef: SVGSVGElement | undefined;
  let dragState: DragState | null = null;
  const panels = createMemo(() => getPanelRects(props.page));
  const paperSize = createMemo(() => getPaperSizeOption(props.page.paperSize));

  onCleanup(() => {
    removeDragListeners();
  });

  function addDragListeners() {
    if (typeof window === "undefined") return;
    window.addEventListener("pointermove", updateDrag);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
  }

  function removeDragListeners() {
    if (typeof window === "undefined") return;
    window.removeEventListener("pointermove", updateDrag);
    window.removeEventListener("pointerup", endDrag);
    window.removeEventListener("pointercancel", endDrag);
  }

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
    addDragListeners();
  }

  function resizeText(event: PointerEvent, text: ComicTextElement, corner: ResizeCorner) {
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
      startX: text.x,
      startY: text.y,
      startWidth: text.width,
      startHeight: getTextHeight(text),
      corner,
    };
    addDragListeners();
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
    const pointerDeltaX = ((event.clientX - state.startClientX) / bounds.width) * 100;
    const pointerDeltaY = ((event.clientY - state.startClientY) / bounds.height) * 100;
    const adjustsLeft = state.corner === "nw" || state.corner === "sw";
    const adjustsTop = state.corner === "nw" || state.corner === "ne";
    const widthDelta = adjustsLeft ? -pointerDeltaX : pointerDeltaX;
    const heightDelta = adjustsTop ? -pointerDeltaY : pointerDeltaY;
    const width = clamp(state.startWidth + widthDelta, 8, 96);
    const height = clamp(state.startHeight + heightDelta, 5, 50);
    props.onUpdateText(state.textId, {
      width,
      height,
      x: adjustsLeft ? state.startX + state.startWidth - width : state.startX,
      y: adjustsTop ? state.startY + state.startHeight - height : state.startY,
      panelIndex: findPanelIndex(
        panels(),
        adjustsLeft ? state.startX + state.startWidth - width : state.startX,
        adjustsTop ? state.startY + state.startHeight - height : state.startY,
      ),
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
    removeDragListeners();
  }

  function handlePagePointerDown(event: PointerEvent) {
    if ((event.target as Element).closest(".comic-svg-text")) return;
    props.onDeselectText();
  }

  return (
    <div
      class="comic-paper"
      data-paper-size={paperSize().id}
      style={{
        "--comic-paper-width": `${paperSize().width}in`,
        "--comic-paper-height": `${paperSize().height}in`,
        "--comic-paper-ratio-width": paperSize().width,
        "--comic-paper-ratio-height": paperSize().height,
      }}
      aria-label="Printable comic page preview"
    >
      <svg
        ref={layoutRef}
        class={`comic-page-layout comic-page-svg ${props.page.layout}`}
        role="img"
        aria-label="Comic page"
        xmlns="http://www.w3.org/2000/svg"
        onPointerMove={updateDrag}
        onPointerDown={handlePagePointerDown}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <For each={panels()}>
          {(panel) => (
            <rect
              class="comic-panel-svg"
              x={`${panel.x}%`}
              y={`${panel.y}%`}
              width={`${panel.width}%`}
              height={`${panel.height}%`}
            />
          )}
        </For>

        <For each={props.page.texts}>
          {(text) => (
            <ComicTextSvg
              text={text}
              selected={props.selectedTextId === text.id}
              onPointerDown={(event) => dragText(event, text)}
              onResizePointerDown={(event, corner) => resizeText(event, text, corner)}
            />
          )}
        </For>
      </svg>
    </div>
  );
}

function ComicTextSvg(props: {
  text: ComicTextElement;
  selected: boolean;
  onPointerDown: (event: PointerEvent) => void;
  onResizePointerDown: (event: PointerEvent, corner: ResizeCorner) => void;
}) {
  const lines = createMemo(() => getTextLines(props.text));
  const boxHeight = () => getTextHeight(props.text);
  const textAnchor = () => (props.text.align === "left" ? "start" : props.text.align === "right" ? "end" : "middle");
  const textX = () => (props.text.align === "left" ? "8%" : props.text.align === "right" ? "92%" : "50%");
  const textY = () => {
    if (props.text.kind === "speech") return "44%";
    if (props.text.kind === "thought") return "36%";
    return "50%";
  };
  const firstLineDy = () => `${(-((lines().length - 1) * lineHeightMultiplier)) / 2}em`;
  const handlePointerDown = (event: PointerEvent) => {
    const resizeHandle = (event.target as Element).closest<SVGCircleElement>(".comic-svg-handle-resize");
    const corner = resizeHandle?.dataset.corner as ResizeCorner | undefined;
    if (corner) {
      props.onResizePointerDown(event, corner);
      return;
    }

    props.onPointerDown(event);
  };

  return (
    <svg
      class={`comic-svg-text comic-svg-text-${props.text.kind}`}
      classList={{ selected: props.selected }}
      x={`${props.text.x}%`}
      y={`${props.text.y}%`}
      width={`${props.text.width}%`}
      height={`${boxHeight()}%`}
      overflow="visible"
      onPointerDown={handlePointerDown}
    >
      <rect class="comic-svg-hitbox" x="0" y="0" width="100%" height="100%" />
      <Show when={props.text.kind === "speech"}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" overflow="visible">
          <path class="comic-svg-shape comic-svg-speech-shape" d={speechBubblePath} />
        </svg>
      </Show>
      <Show when={props.text.kind === "thought"}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" overflow="visible">
          <rect class="comic-svg-shape comic-svg-thought-shape" x="1" y="1" width="98" height="68" rx="18" />
          <circle class="comic-svg-shape comic-svg-thought-dot" cx="18" cy="82" r="7" />
          <circle class="comic-svg-shape comic-svg-thought-dot" cx="9" cy="94" r="4" />
        </svg>
      </Show>
      <Show when={props.text.kind === "caption"}>
        <rect class="comic-svg-shape comic-svg-caption-shape" x="0" y="0" width="100%" height="100%" />
      </Show>
      <Show when={props.selected}>
        <rect class="comic-svg-selection" x="0" y="0" width="100%" height="100%" />
        <circle
          class="comic-svg-handle comic-svg-handle-resize comic-svg-handle-resize-nw"
          data-corner="nw"
          cx="0"
          cy="0"
          r="7"
        />
        <circle
          class="comic-svg-handle comic-svg-handle-resize comic-svg-handle-resize-ne"
          data-corner="ne"
          cx="100%"
          cy="0"
          r="7"
        />
        <circle
          class="comic-svg-handle comic-svg-handle-resize comic-svg-handle-resize-sw"
          data-corner="sw"
          cx="0"
          cy="100%"
          r="7"
        />
        <circle
          class="comic-svg-handle comic-svg-handle-resize comic-svg-handle-resize-se"
          data-corner="se"
          cx="100%"
          cy="100%"
          r="7"
        />
      </Show>
      <text
        class="comic-svg-text-content"
        classList={{ "comic-svg-sfx-text": props.text.kind === "sfx" }}
        x={textX()}
        y={textY()}
        dominant-baseline="middle"
        text-anchor={textAnchor()}
        style={{ "font-size": `${props.text.fontSize}px` }}
      >
        <For each={lines()}>
          {(line, index) => (
            <tspan x={textX()} dy={index() === 0 ? firstLineDy() : `${lineHeightMultiplier}em`}>
              {line}
            </tspan>
          )}
        </For>
      </text>
    </svg>
  );
}

function getTextHeight(text: ComicTextElement) {
  return text.height ?? getDefaultTextHeight(text.kind, text.text, text.fontSize);
}

function getTextLines(text: ComicTextElement) {
  const explicitLines = text.text.split("\n");
  if (text.autoWrap === false) {
    return explicitLines;
  }

  const usableWidth = getUsableTextWidth(text);
  const averageCharacterWidth = text.fontSize * (text.kind === "sfx" ? 0.68 : 0.58);
  const maxCharacters = Math.max(1, Math.floor(usableWidth / averageCharacterWidth));

  return explicitLines.flatMap((line) => wrapLine(line, maxCharacters));
}

function getUsableTextWidth(text: ComicTextElement) {
  const pageWidthPixels = 600;
  const horizontalPadding = text.kind === "caption" || text.kind === "sfx" ? 0.1 : 0.18;
  return Math.max(1, text.width * pageWidthPixels * (1 - horizontalPadding) / 100);
}

function wrapLine(line: string, maxCharacters: number) {
  if (!line.trim()) {
    return [line];
  }

  const wrapped: string[] = [];
  let currentLine = "";

  for (const word of line.trim().split(/\s+/)) {
    if (!currentLine) {
      wrapped.push(...splitLongWord(word, maxCharacters));
      currentLine = wrapped.pop() ?? "";
      continue;
    }

    const candidate = `${currentLine} ${word}`;
    if (candidate.length <= maxCharacters) {
      currentLine = candidate;
      continue;
    }

    wrapped.push(currentLine);
    const pieces = splitLongWord(word, maxCharacters);
    currentLine = pieces.pop() ?? "";
    wrapped.push(...pieces);
  }

  if (currentLine) {
    wrapped.push(currentLine);
  }

  return wrapped.length > 0 ? wrapped : [line];
}

function splitLongWord(word: string, maxCharacters: number) {
  if (word.length <= maxCharacters) {
    return word ? [word] : [];
  }

  const pieces: string[] = [];
  for (let index = 0; index < word.length; index += maxCharacters) {
    pieces.push(word.slice(index, index + maxCharacters));
  }
  return pieces;
}
